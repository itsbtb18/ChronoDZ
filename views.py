from __future__ import annotations

from datetime import datetime, time, timedelta

from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from models import Booking, BookingStatus, Resource, ResourceStatus, UserRole
from serializers import (
    AvailableSlotSerializer,
    AvailableSlotsQuerySerializer,
    BookingCreateSerializer,
    BookingReadSerializer,
)

OPENING_TIME = time(8, 0)
CLOSING_TIME = time(22, 0)
SLOT_STEP_MINUTES = 15


class BookingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Booking.objects.select_related(
        "user", "resource", "resource__establishment", "validated_by_admin"
    )

    def get_serializer_class(self):
        if self.action == "create":
            return BookingCreateSerializer
        if self.action == "available_slots":
            return AvailableSlotsQuerySerializer
        return BookingReadSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if user.role == UserRole.SUPER_ADMIN:
            return queryset

        if user.role == UserRole.ADMIN:
            return queryset.filter(resource__establishment_id=user.establishment_id)

        return queryset.filter(user=user)

    @action(detail=False, methods=["get"], url_path="available-slots")
    def available_slots(self, request):
        query_serializer = AvailableSlotsQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)

        booking_date = query_serializer.validated_data["date"]
        establishment_id = query_serializer.validated_data["establishment_id"]
        duration = query_serializer.validated_data["duration"]

        active_resources = Resource.objects.filter(
            establishment_id=establishment_id,
            status=ResourceStatus.ACTIVE,
        ).count()

        active_bookings = list(
            Booking.objects.filter(
                resource__establishment_id=establishment_id,
                booking_date=booking_date,
                resource__status=ResourceStatus.ACTIVE,
            )
            .exclude(status=BookingStatus.CANCELLED)
            .values_list("resource_id", "start_time", "end_time")
        )

        slots = []
        current_start = datetime.combine(booking_date, OPENING_TIME)
        last_start = datetime.combine(booking_date, CLOSING_TIME) - timedelta(
            minutes=duration
        )

        while current_start <= last_start:
            current_end = current_start + timedelta(minutes=duration)
            reserved_resource_ids = {
                resource_id
                for resource_id, booking_start, booking_end in active_bookings
                if booking_start < current_end.time()
                and booking_end > current_start.time()
            }

            reserved_resources = len(reserved_resource_ids)
            available_resources = max(active_resources - reserved_resources, 0)
            is_full = active_resources == 0 or reserved_resources >= active_resources

            slots.append(
                {
                    "start_time": current_start.time(),
                    "end_time": current_end.time(),
                    "reserved_resources": reserved_resources,
                    "total_resources": active_resources,
                    "available_resources": available_resources,
                    "status": "FULL" if is_full else "AVAILABLE",
                    "status_label": "Complet" if is_full else "Disponible",
                    "color": "red" if is_full else "green",
                }
            )

            current_start += timedelta(minutes=SLOT_STEP_MINUTES)

        return Response(
            {
                "date": booking_date,
                "establishment_id": establishment_id,
                "duration": duration,
                "opening_time": OPENING_TIME,
                "closing_time": CLOSING_TIME,
                "total_resources": active_resources,
                "slots": AvailableSlotSerializer(slots, many=True).data,
            }
        )

    @transaction.atomic
    def perform_create(self, serializer):
        resource = serializer.validated_data["resource"]
        booking_date = serializer.validated_data["booking_date"]
        start_time = serializer.validated_data["start_time"]
        end_time = serializer.validated_data["end_time"]

        locked_resource = (
            Resource.objects.select_for_update()
            .select_related("establishment")
            .get(pk=resource.pk)
        )

        conflicting_bookings = (
            Booking.objects.select_for_update()
            .filter(
                resource=locked_resource,
                booking_date=booking_date,
            )
            .exclude(status=BookingStatus.CANCELLED)
            .filter(start_time__lt=end_time, end_time__gt=start_time)
        )

        if conflicting_bookings.exists():
            raise ValidationError(
                {"resource": "Cette ressource est déjà réservée sur ce créneau."}
            )

        if (
            self.request.user.role == UserRole.ADMIN
            and locked_resource.establishment_id != self.request.user.establishment_id
        ):
            raise ValidationError(
                {"resource": "Un ADMIN ne peut réserver que dans son établissement."}
            )

        serializer.save(
            user=self.request.user,
            resource=locked_resource,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        instance = serializer.instance
        output_serializer = BookingReadSerializer(
            instance, context=self.get_serializer_context()
        )
        headers = self.get_success_headers(output_serializer.data)
        return Response(
            output_serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )
