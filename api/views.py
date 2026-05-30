from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from decimal import Decimal

import requests
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import ExtractHour, ExtractWeekDay
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import (
    ChronoJWTAuthentication,
    build_login_response,
    extract_login_payload,
)
from .models import (
    Booking,
    BookingStatus,
    CustomUser,
    Establishment,
    Resource,
    ResourceStatus,
    SystemConfig,
    UserRole,
)
from .serializers import (
    BookingReceiptSerializer,
    BookingSerializer,
    CustomUserSerializer,
    EstablishmentSerializer,
    ResourceSerializer,
    SuperAdminBookingHistorySerializer,
    SuperAdminManagerSerializer,
    SuperAdminStatsSerializer,
    SystemConfigSerializer,
)

OPENING_TIME = time(8, 0)
CLOSING_TIME = time(22, 0)
DEFAULT_SLOT_STEP_MINUTES = 15
PRICE_PER_MINUTE = Decimal("15.00")
WEEKDAY_COUNT = 7
WORKING_DAY_SLOT_COUNT = int(
    (CLOSING_TIME.hour * 60 - OPENING_TIME.hour * 60) / DEFAULT_SLOT_STEP_MINUTES
)


class IsSuperAdmin(permissions.BasePermission):
    message = "Accès réservé au Super Admin."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.SUPER_ADMIN
        )


@dataclass(frozen=True)
class NotificationPayload:
    phone: str
    message: str


def send_whatsapp_notification(payload: NotificationPayload) -> None:
    api_url = "http://localhost:5000/api/v1/send-notification"
    api_key = os.getenv("DJANGO_API_KEY", "")
    if not api_key:
        return

    try:
        requests.post(
            api_url,
            json={"phone": payload.phone, "message": payload.message},
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10,
        )
    except requests.RequestException:
        return


def _active_resources_count(establishment_id: int) -> int:
    return Resource.objects.filter(
        establishment_id=establishment_id,
        status=ResourceStatus.ACTIF,
    ).count()


def _overlapping_bookings_queryset(
    establishment_id: int, booking_date, start_time, end_time
):
    return (
        Booking.objects.select_for_update()
        .filter(
            resource__establishment_id=establishment_id,
            booking_date=booking_date,
        )
        .exclude(status=BookingStatus.ANNULE)
        .filter(start_time__lt=end_time, end_time__gt=start_time)
    )


class EstablishmentViewSet(viewsets.ModelViewSet):
    queryset = Establishment.objects.all().order_by("name")
    serializer_class = EstablishmentSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [ChronoJWTAuthentication]


class ResourceViewSet(viewsets.ModelViewSet):
    queryset = (
        Resource.objects.select_related("establishment")
        .all()
        .order_by("establishment__name", "label")
    )
    serializer_class = ResourceSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [ChronoJWTAuthentication]

    def get_queryset(self):
        queryset = super().get_queryset()
        establishment_id = self.request.query_params.get("establishment_id")
        if establishment_id:
            queryset = queryset.filter(establishment_id=establishment_id)
        return queryset


class CustomUserViewSet(viewsets.ModelViewSet):
    queryset = (
        CustomUser.objects.select_related("establishment")
        .all()
        .order_by("-date_joined")
    )
    serializer_class = CustomUserSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [ChronoJWTAuthentication]

    def get_queryset(self):
        queryset = super().get_queryset()
        role = self.request.query_params.get("role")
        search = self.request.query_params.get("search")
        if role:
            queryset = queryset.filter(role=role)
        if search:
            queryset = queryset.filter(
                Q(phone__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        return queryset

    def perform_create(self, serializer):
        created_in_person = serializer.validated_data.get("created_in_person", False)
        user = serializer.save()

        if created_in_person:
            send_whatsapp_notification(
                NotificationPayload(
                    phone=user.phone,
                    message=(
                        f"Bienvenue {user.first_name} {user.last_name}. "
                        f"Votre compte Chrono.dz est prêt."
                    ),
                )
            )

    def perform_update(self, serializer):
        previous_instance = self.get_object()
        old_status = previous_instance.role
        user = serializer.save()

        if user.role == UserRole.CUSTOMER and old_status != user.role:
            send_whatsapp_notification(
                NotificationPayload(
                    phone=user.phone,
                    message=(
                        f"Bonjour {user.first_name}, votre compte a été créé avec succès sur Chrono.dz."
                    ),
                )
            )


class BookingViewSet(viewsets.ModelViewSet):
    queryset = (
        Booking.objects.select_related(
            "user",
            "resource",
            "resource__establishment",
            "validated_by",
        )
        .all()
        .order_by("-created_at")
    )
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [ChronoJWTAuthentication]

    def get_queryset(self):
        queryset = super().get_queryset()
        establishment_id = self.request.query_params.get("establishment_id")
        booking_date = self.request.query_params.get("date")
        search = self.request.query_params.get("search")
        if establishment_id:
            queryset = queryset.filter(resource__establishment_id=establishment_id)
        if booking_date:
            queryset = queryset.filter(booking_date=booking_date)
        if search:
            queryset = queryset.filter(
                Q(booking_reference__icontains=search) |
                Q(user__phone__icontains=search) |
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search)
            )
        return queryset

    @action(detail=True, methods=["get"], url_path="receipt")
    def receipt(self, request, pk=None):
        booking = self.get_queryset().get(pk=pk)
        secret_code = request.query_params.get("secret_code")
        ticket_kind = request.query_params.get("ticket_kind", "booking")

        payload = {
            "booking_id": booking.id,
            "booking_reference": booking.booking_reference,
            "establishment_name": booking.resource.establishment.name,
            "establishment_address": booking.resource.establishment.address,
            "booking_date": booking.booking_date,
            "start_time": booking.start_time,
            "end_time": booking.end_time,
            "client_first_name": booking.user.first_name,
            "client_last_name": booking.user.last_name,
            "client_phone": booking.user.phone,
            "secret_code": secret_code if ticket_kind == "account" else None,
            "total_price": booking.total_price,
            "payment_status": booking.status,
            "payment_status_label": booking.get_status_display(),
            "qr_text": f"VALIDATE_BOOKING:{booking.booking_reference}",
            "created_at": booking.created_at,
        }

        serializer = BookingReceiptSerializer(payload)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="available-slots")
    def available_slots(self, request):
        date_value = request.query_params.get("date")
        establishment_id = request.query_params.get("establishment_id")
        duration = int(request.query_params.get("duration", DEFAULT_SLOT_STEP_MINUTES))

        if not date_value or not establishment_id:
            raise ValidationError(
                {"detail": "Les paramètres date et establishment_id sont obligatoires."}
            )

        if duration not in {15, 30, 60}:
            raise ValidationError(
                {"duration": "La durée doit être 15, 30 ou 60 minutes."}
            )

        try:
            booking_date = datetime.strptime(date_value, "%Y-%m-%d").date()
            establishment_id_int = int(establishment_id)
        except ValueError as exc:
            raise ValidationError({"detail": "Paramètres invalides."}) from exc

        active_resources = _active_resources_count(establishment_id_int)
        slots = []
        current_start = datetime.combine(booking_date, OPENING_TIME)
        last_start = datetime.combine(booking_date, CLOSING_TIME) - timedelta(
            minutes=duration
        )

        while current_start <= last_start:
            current_end = current_start + timedelta(minutes=duration)
            overlapping_count = (
                Booking.objects.filter(
                    resource__establishment_id=establishment_id_int,
                    booking_date=booking_date,
                    resource__status=ResourceStatus.ACTIF,
                )
                .exclude(status=BookingStatus.ANNULE)
                .filter(
                    start_time__lt=current_end.time(), end_time__gt=current_start.time()
                )
                .values("resource_id")
                .distinct()
                .count()
            )

            is_full = active_resources == 0 or overlapping_count >= active_resources
            slots.append(
                {
                    "start_time": current_start.time().strftime("%H:%M"),
                    "end_time": current_end.time().strftime("%H:%M"),
                    "reserved_resources": overlapping_count,
                    "total_resources": active_resources,
                    "available_resources": max(active_resources - overlapping_count, 0),
                    "status": "FULL" if is_full else "AVAILABLE",
                    "status_label": "Complet" if is_full else "Disponible",
                    "color": "red" if is_full else "green",
                }
            )
            current_start += timedelta(minutes=duration)

        return Response(
            {
                "date": booking_date,
                "establishment_id": establishment_id_int,
                "duration": duration,
                "opening_time": OPENING_TIME.strftime("%H:%M"),
                "closing_time": CLOSING_TIME.strftime("%H:%M"),
                "total_resources": active_resources,
                "slots": slots,
            }
        )

    @transaction.atomic
    def perform_create(self, serializer):
        resource = serializer.validated_data["resource"]
        booking_date = serializer.validated_data["booking_date"]
        start_time = serializer.validated_data["start_time"]
        end_time = serializer.validated_data["end_time"]

        locked_resource = Resource.objects.select_for_update().get(pk=resource.pk)

        conflict_exists = (
            _overlapping_bookings_queryset(
                locked_resource.establishment_id,
                booking_date,
                start_time,
                end_time,
            )
            .filter(resource=locked_resource)
            .exists()
        )

        if conflict_exists:
            raise ValidationError(
                {"resource": "Cette ressource est déjà réservée sur ce créneau."}
            )

        if (
            self.request.user.role == UserRole.ADMIN
            and self.request.user.establishment_id != locked_resource.establishment_id
        ):
            raise ValidationError(
                {"resource": "Un ADMIN ne peut réserver que dans son établissement."}
            )

        booking = serializer.save(
            validated_by=self.request.user
            if self.request.user.role == UserRole.ADMIN
            else None,
        )

        if booking.status == BookingStatus.PAYE and booking.validated_by_id:
            send_whatsapp_notification(
                NotificationPayload(
                    phone=booking.user.phone,
                    message=(
                        f"Bonjour {booking.user.first_name}, votre réservation du {booking.booking_date} "
                        f"à {booking.start_time.strftime('%H:%M')} est validée."
                    ),
                )
            )

    def perform_update(self, serializer):
        previous_instance = self.get_object()
        old_status = previous_instance.status
        
        # If status becomes PAYE and validated_by is not set, set it to request.user
        if (
            self.request.user.role in {UserRole.ADMIN, UserRole.SUPER_ADMIN}
            and serializer.validated_data.get("status") == BookingStatus.PAYE
            and not previous_instance.validated_by
        ):
            serializer.validated_data["validated_by"] = self.request.user
            serializer.validated_data["validated_at"] = timezone.now()

        booking = serializer.save()

        if old_status != BookingStatus.PAYE and booking.status == BookingStatus.PAYE:
            send_whatsapp_notification(
                NotificationPayload(
                    phone=booking.user.phone,
                    message=(
                        f"Bonjour {booking.user.first_name}, votre rendez-vous du {booking.booking_date} "
                        f"à {booking.start_time.strftime('%H:%M')} a été validé."
                    ),
                )
            )


class SuperAdminEstablishmentViewSet(viewsets.ModelViewSet):
    queryset = Establishment.objects.all().order_by("name")
    serializer_class = EstablishmentSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    authentication_classes = [ChronoJWTAuthentication]


class SuperAdminManagerViewSet(viewsets.ModelViewSet):
    queryset = (
        CustomUser.objects.select_related("establishment")
        .filter(role=UserRole.ADMIN)
        .order_by("-date_joined")
    )
    serializer_class = SuperAdminManagerSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    authentication_classes = [ChronoJWTAuthentication]

    def get_queryset(self):
        return (
            CustomUser.objects.select_related("establishment")
            .filter(role=UserRole.ADMIN)
            .order_by("-date_joined")
        )

    def perform_create(self, serializer):
        serializer.save(role=UserRole.ADMIN)

    def perform_update(self, serializer):
        serializer.save(role=UserRole.ADMIN)


class SuperAdminHistoryAPIView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    authentication_classes = [ChronoJWTAuthentication]

    def get(self, request):
        queryset = (
            Booking.objects.select_related(
                "user",
                "validated_by",
                "resource",
                "resource__establishment",
            )
            .all()
            .order_by("-validated_at", "-created_at")
        )

        establishment_id = request.query_params.get("establishment_id")
        date_value = request.query_params.get("date")
        user_id = request.query_params.get("user_id")

        if establishment_id:
            try:
                queryset = queryset.filter(
                    resource__establishment_id=int(establishment_id)
                )
            except ValueError as exc:
                raise ValidationError(
                    {"establishment_id": "Identifiant invalide."}
                ) from exc

        if user_id:
            try:
                queryset = queryset.filter(user_id=int(user_id))
            except ValueError as exc:
                raise ValidationError({"user_id": "Identifiant invalide."}) from exc

        if date_value:
            try:
                parsed_date = datetime.strptime(date_value, "%Y-%m-%d").date()
            except ValueError as exc:
                raise ValidationError(
                    {"date": "La date doit être au format YYYY-MM-DD."}
                ) from exc
            queryset = queryset.filter(booking_date=parsed_date)

        serializer = SuperAdminBookingHistorySerializer(queryset, many=True)
        return Response(serializer.data)


class SuperAdminStatsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    authentication_classes = [ChronoJWTAuthentication]

    def get(self, request):
        today = timezone.localdate()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=WEEKDAY_COUNT - 1)

        results = []
        establishments = Establishment.objects.all().order_by("name")

        for establishment in establishments:
            active_resources = Resource.objects.filter(
                establishment=establishment,
                status=ResourceStatus.ACTIF,
            ).count()

            total_week_slots = active_resources * WEEKDAY_COUNT * WORKING_DAY_SLOT_COUNT
            occupied_slots = self._count_occupied_slots(
                establishment.id, week_start, week_end, active_resources
            )
            saturation_percentage = (
                (Decimal(occupied_slots) / Decimal(total_week_slots) * Decimal("100"))
                if total_week_slots
                else Decimal("0.00")
            )
            saturation_percentage = saturation_percentage.quantize(Decimal("0.01"))

            results.append(
                {
                    "establishment_id": establishment.id,
                    "establishment_name": establishment.name,
                    "active_resources": active_resources,
                    "occupied_slots": occupied_slots,
                    "total_week_slots": total_week_slots,
                    "saturation_percentage": saturation_percentage,
                    "needs_more_resources": active_resources == 0
                    or saturation_percentage > Decimal("80.00"),
                }
            )

        payload = {
            "week_start": week_start,
            "week_end": week_end,
            "results": SuperAdminStatsSerializer(results, many=True).data,
        }
        return Response(payload)

    def _count_occupied_slots(
        self, establishment_id: int, week_start, week_end, active_resources: int
    ) -> int:
        if active_resources == 0:
            return 0

        bookings = list(
            Booking.objects.filter(
                resource__establishment_id=establishment_id,
                resource__status=ResourceStatus.ACTIF,
                booking_date__range=(week_start, week_end),
            )
            .exclude(status=BookingStatus.ANNULE)
            .values("resource_id", "booking_date", "start_time", "end_time")
        )

        occupied_slots = 0
        for day_offset in range(WEEKDAY_COUNT):
            current_day = week_start + timedelta(days=day_offset)
            current_start = datetime.combine(current_day, OPENING_TIME)
            last_start = datetime.combine(current_day, CLOSING_TIME) - timedelta(
                minutes=DEFAULT_SLOT_STEP_MINUTES
            )

            while current_start <= last_start:
                current_end = current_start + timedelta(
                    minutes=DEFAULT_SLOT_STEP_MINUTES
                )
                occupied_resources = {
                    booking["resource_id"]
                    for booking in bookings
                    if booking["booking_date"] == current_day
                    and booking["start_time"] < current_end.time()
                    and booking["end_time"] > current_start.time()
                }

                if len(occupied_resources) >= active_resources:
                    occupied_slots += 1

                current_start += timedelta(minutes=DEFAULT_SLOT_STEP_MINUTES)

        return occupied_slots


DAY_NAMES_FR = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]


class SuperAdminFinancialSummaryAPIView(APIView):
    """Résumé financier pour le Super Admin."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    authentication_classes = [ChronoJWTAuthentication]

    def get(self, request):
        today = timezone.localdate()
        week_start = today - timedelta(days=today.weekday())  # Lundi
        month_start = today.replace(day=1)

        base_qs = Booking.objects.exclude(status=BookingStatus.ANNULE)

        # ── Période : aujourd'hui / semaine / mois ──
        today_qs = base_qs.filter(booking_date=today)
        week_qs = base_qs.filter(booking_date__gte=week_start, booking_date__lte=today)
        month_qs = base_qs.filter(booking_date__gte=month_start, booking_date__lte=today)

        today_agg = today_qs.aggregate(
            revenue=Sum("total_price"), bookings_count=Count("id")
        )
        week_agg = week_qs.aggregate(
            revenue=Sum("total_price"), bookings_count=Count("id")
        )
        month_agg = month_qs.aggregate(
            revenue=Sum("total_price"), bookings_count=Count("id")
        )

        # ── Par établissement ──
        establishments = Establishment.objects.all().order_by("name")
        by_establishment = []
        for est in establishments:
            est_base = base_qs.filter(resource__establishment=est)
            est_today = est_base.filter(booking_date=today).aggregate(
                revenue=Sum("total_price"), count=Count("id")
            )
            est_week = est_base.filter(
                booking_date__gte=week_start, booking_date__lte=today
            ).aggregate(revenue=Sum("total_price"))
            est_month = est_base.filter(
                booking_date__gte=month_start, booking_date__lte=today
            ).aggregate(revenue=Sum("total_price"))

            by_establishment.append(
                {
                    "id": est.id,
                    "name": est.name,
                    "revenue_today": est_today["revenue"] or Decimal("0.00"),
                    "revenue_week": est_week["revenue"] or Decimal("0.00"),
                    "revenue_month": est_month["revenue"] or Decimal("0.00"),
                    "bookings_today": est_today["count"] or 0,
                }
            )

        # ── Fréquence horaire (semaine en cours) ──
        hourly_data = (
            week_qs.annotate(hour=ExtractHour("start_time"))
            .values("hour")
            .annotate(count=Count("id"))
            .order_by("hour")
        )
        hourly_map = {entry["hour"]: entry["count"] for entry in hourly_data}
        hourly_frequency = [
            {"hour": f"{h:02d}:00", "count": hourly_map.get(h, 0)}
            for h in range(OPENING_TIME.hour, CLOSING_TIME.hour)
        ]

        # ── Fréquence journalière (mois en cours) ──
        daily_data = (
            month_qs.annotate(dow=ExtractWeekDay("booking_date"))
            .values("dow")
            .annotate(count=Count("id"))
            .order_by("dow")
        )
        # Django ExtractWeekDay: 1=Dimanche … 7=Samedi
        # Convertir vers Python weekday: 0=Lundi … 6=Dimanche
        django_dow_to_py = {2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 1: 6}
        daily_map = {
            django_dow_to_py.get(entry["dow"], 0): entry["count"]
            for entry in daily_data
        }
        daily_frequency = [
            {"day": DAY_NAMES_FR[i], "count": daily_map.get(i, 0)} for i in range(7)
        ]

        return Response(
            {
                "today": {
                    "revenue": today_agg["revenue"] or Decimal("0.00"),
                    "bookings_count": today_agg["bookings_count"] or 0,
                },
                "this_week": {
                    "revenue": week_agg["revenue"] or Decimal("0.00"),
                    "bookings_count": week_agg["bookings_count"] or 0,
                },
                "this_month": {
                    "revenue": month_agg["revenue"] or Decimal("0.00"),
                    "bookings_count": month_agg["bookings_count"] or 0,
                },
                "by_establishment": by_establishment,
                "hourly_frequency": hourly_frequency,
                "daily_frequency": daily_frequency,
            }
        )


class SystemConfigAPIView(APIView):
    """Lecture / mise à jour de la configuration système (singleton)."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    authentication_classes = [ChronoJWTAuthentication]

    def get(self, request):
        config = SystemConfig.load()
        serializer = SystemConfigSerializer(config)
        return Response(serializer.data)

    def put(self, request):
        config = SystemConfig.load()
        serializer = SystemConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CustomerLoginAPIView(GenericAPIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        phone, secret_code = extract_login_payload(request.data)
        if not phone or not secret_code:
            return Response(
                {"detail": "Numéro de téléphone et code secret requis."},
                status=400,
            )

        try:
            user = CustomUser.objects.select_related("establishment").get(phone=phone)
        except CustomUser.DoesNotExist:
            return Response({"detail": "Identifiants invalides."}, status=401)

        if not user.check_secret_code(secret_code):
            return Response({"detail": "Identifiants invalides."}, status=401)

        if user.role != UserRole.CUSTOMER:
            return Response(
                {"detail": "Cette route est réservée aux clients."},
                status=403,
            )

        return Response(build_login_response(user), status=200)


class StaffLoginAPIView(GenericAPIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        phone, secret_code = extract_login_payload(request.data)
        if not phone or not secret_code:
            return Response(
                {"detail": "Numéro de téléphone et code secret requis."},
                status=400,
            )

        try:
            user = CustomUser.objects.select_related("establishment").get(phone=phone)
        except CustomUser.DoesNotExist:
            return Response({"detail": "Identifiants invalides."}, status=401)

        if not user.check_secret_code(secret_code):
            return Response({"detail": "Identifiants invalides."}, status=401)

        if user.role == UserRole.CUSTOMER:
            return Response(
                {"detail": "Accès réservé au personnel autorisé."},
                status=403,
            )

        return Response(build_login_response(user), status=200)
