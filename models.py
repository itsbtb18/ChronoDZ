from __future__ import annotations

import re
from decimal import Decimal

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.db.models import F

phone_validator = RegexValidator(
    regex=r"^0[2567]\d{8}$",
    message="Le numéro doit être valide",
)

secret_code_validator = RegexValidator(
    regex=r"^\d{6}$",
    message="Le code secret doit contenir exactement 6 chiffres.",
)


def normalize_algerian_phone_number(phone_number: str) -> str:
    return re.sub(r"[\s\-\.\(\)]", "", phone_number or "")


class UserRole(models.TextChoices):
    SUPER_ADMIN = "SUPER_ADMIN", "Super admin"
    ADMIN = "ADMIN", "Admin"
    USER = "USER", "User"


class CustomUserManager(BaseUserManager):
    def create_user(self, phone_number, secret_code, **extra_fields):
        if not phone_number:
            raise ValueError("Le numéro de téléphone est obligatoire.")
        if not secret_code:
            raise ValueError("Le code secret est obligatoire.")

        phone_number = normalize_algerian_phone_number(phone_number)
        phone_validator(phone_number)
        secret_code_validator(str(secret_code))

        extra_fields.setdefault("role", UserRole.USER)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)

        user = self.model(phone_number=phone_number, **extra_fields)
        user.set_password(str(secret_code))
        user.full_clean(exclude={"password"})
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, secret_code, **extra_fields):
        extra_fields.setdefault("role", UserRole.SUPER_ADMIN)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("role") != UserRole.SUPER_ADMIN:
            raise ValueError("Un superuser doit avoir le rôle SUPER_ADMIN.")

        if not extra_fields.get("is_staff"):
            raise ValueError("Un superuser doit avoir is_staff=True.")

        if not extra_fields.get("is_superuser"):
            raise ValueError("Un superuser doit avoir is_superuser=True.")

        return self.create_user(phone_number, secret_code, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    phone_number = models.CharField(
        max_length=10,
        unique=True,
        validators=[phone_validator],
        verbose_name="Numéro de téléphone",
    )
    first_name = models.CharField(max_length=150, verbose_name="Prénom")
    last_name = models.CharField(max_length=150, verbose_name="Nom")
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.USER,
        verbose_name="Rôle",
    )
    establishment = models.ForeignKey(
        "Establishment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
        verbose_name="Établissement",
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = CustomUserManager()

    USERNAME_FIELD = "phone_number"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        indexes = [models.Index(fields=["phone_number"])]

    def clean(self):
        super().clean()
        self.phone_number = normalize_algerian_phone_number(self.phone_number)
        phone_validator(self.phone_number)

        if self.role == UserRole.ADMIN and self.establishment_id is None:
            raise ValidationError(
                {"establishment": "Un ADMIN doit être lié à un établissement."}
            )

        if self.role == UserRole.SUPER_ADMIN:
            self.establishment = None

        self.is_staff = self.role in {UserRole.ADMIN, UserRole.SUPER_ADMIN}
        self.is_superuser = self.role == UserRole.SUPER_ADMIN

    def set_secret_code(self, secret_code: str) -> None:
        secret_code_validator(str(secret_code))
        self.set_password(str(secret_code))

    def check_secret_code(self, secret_code: str) -> bool:
        return self.check_password(str(secret_code))

    def save(self, *args, **kwargs):
        self.full_clean(exclude={"password"})
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name} ({self.phone_number})"


class Establishment(models.Model):
    name = models.CharField(max_length=255, verbose_name="Nom")
    address = models.CharField(max_length=255, verbose_name="Adresse")
    city = models.CharField(max_length=120, verbose_name="Ville")
    created_at = models.DateTimeField(
        auto_now_add=True, verbose_name="Date de création"
    )

    class Meta:
        verbose_name = "Établissement"
        verbose_name_plural = "Établissements"
        indexes = [models.Index(fields=["name"]), models.Index(fields=["city"])]

    def __str__(self) -> str:
        return f"{self.name} - {self.city}"


class ResourceStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Actif"
    OUT_OF_ORDER = "OUT_OF_ORDER", "En panne"


class Resource(models.Model):
    establishment = models.ForeignKey(
        Establishment,
        on_delete=models.CASCADE,
        related_name="resources",
        verbose_name="Établissement",
    )
    label = models.CharField(max_length=120, verbose_name="Nom / Numéro")
    status = models.CharField(
        max_length=20,
        choices=ResourceStatus.choices,
        default=ResourceStatus.ACTIVE,
        verbose_name="Statut",
    )

    class Meta:
        verbose_name = "Ressource"
        verbose_name_plural = "Ressources"
        constraints = [
            models.UniqueConstraint(
                fields=["establishment", "label"],
                name="unique_resource_label_per_establishment",
            )
        ]
        indexes = [models.Index(fields=["establishment", "status"])]

    def __str__(self) -> str:
        return f"{self.establishment.name} - {self.label}"


class BookingStatus(models.TextChoices):
    PENDING = "PENDING", "En attente"
    PAID = "PAID", "Payé"
    CANCELLED = "CANCELLED", "Annulé"


class Booking(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="bookings",
        verbose_name="Utilisateur",
    )
    resource = models.ForeignKey(
        Resource,
        on_delete=models.PROTECT,
        related_name="bookings",
        verbose_name="Ressource",
    )
    booking_date = models.DateField(verbose_name="Date")
    start_time = models.TimeField(verbose_name="Heure de début")
    end_time = models.TimeField(verbose_name="Heure de fin")
    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING,
        verbose_name="Statut",
    )
    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Prix total",
    )
    validated_by_admin = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="validated_bookings",
        verbose_name="Admin validateur",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Réservation"
        verbose_name_plural = "Réservations"
        constraints = [
            models.CheckConstraint(
                check=models.Q(start_time__lt=F("end_time")),
                name="booking_start_time_before_end_time",
            ),
        ]
        indexes = [
            models.Index(fields=["resource", "booking_date"]),
            models.Index(fields=["status", "booking_date"]),
        ]

    def clean(self):
        super().clean()

        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError(
                {"end_time": "L'heure de fin doit être après l'heure de début."}
            )

        if self.validated_by_admin and self.validated_by_admin.role not in {
            UserRole.ADMIN,
            UserRole.SUPER_ADMIN,
        }:
            raise ValidationError(
                {"validated_by_admin": "Le validateur doit être un admin."}
            )

        if self.status == BookingStatus.CANCELLED:
            return

        if not all(
            [self.resource_id, self.booking_date, self.start_time, self.end_time]
        ):
            return

        overlapping_bookings = Booking.objects.filter(
            resource=self.resource,
            booking_date=self.booking_date,
        ).exclude(status=BookingStatus.CANCELLED)

        if self.pk:
            overlapping_bookings = overlapping_bookings.exclude(pk=self.pk)

        overlapping_bookings = overlapping_bookings.filter(
            start_time__lt=self.end_time,
            end_time__gt=self.start_time,
        )

        if overlapping_bookings.exists():
            raise ValidationError(
                {"resource": "Cette ressource est déjà réservée sur ce créneau."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.resource.label} - {self.booking_date} {self.start_time}-{self.end_time}"
