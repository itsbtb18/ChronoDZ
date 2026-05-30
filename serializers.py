from __future__ import annotations

from datetime import datetime, time, timedelta
from decimal import Decimal

from rest_framework import serializers

from models import Booking, Resource, ResourceStatus, UserRole

PRICE_PER_MINUTE = Decimal("15.00")
ALLOWED_DURATIONS = (15, 30, 60)


class AvailableSlotsQuerySerializer(serializers.Serializer):
    date = serializers.DateField()
    establishment_id = serializers.IntegerField(min_value=1)
    duration = serializers.IntegerField(min_value=1)

    def validate_duration(self, value: int) -> int:
        if value not in ALLOWED_DURATIONS:
            raise serializers.ValidationError(
                "La durée doit être 15, 30 ou 60 minutes."
            )
        return value


class AvailableSlotSerializer(serializers.Serializer):
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    reserved_resources = serializers.IntegerField()
    total_resources = serializers.IntegerField()
    available_resources = serializers.IntegerField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    color = serializers.CharField()


class BookingCreateSerializer(serializers.ModelSerializer):
    duration = serializers.IntegerField(write_only=True, min_value=1)
    total_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = Booking
        fields = [
            "id",
            "resource",
            "booking_date",
            "start_time",
            "duration",
            "end_time",
            "status",
            "total_price",
            "validated_by_admin",
        ]
        read_only_fields = [
            "id",
            "end_time",
            "status",
            "total_price",
            "validated_by_admin",
        ]

    def validate_resource(self, resource: Resource) -> Resource:
        if resource.status != ResourceStatus.ACTIVE:
            raise serializers.ValidationError("Cette ressource est en panne.")
        return resource

    def validate_duration(self, value: int) -> int:
        if value not in ALLOWED_DURATIONS:
            raise serializers.ValidationError(
                "La durée doit être 15, 30 ou 60 minutes."
            )
        return value

    def validate(self, attrs):
        booking_date = attrs["booking_date"]
        start_time = attrs["start_time"]
        duration = attrs["duration"]

        if self.context["request"].user.role == UserRole.ADMIN:
            user_establishment = self.context["request"].user.establishment_id
            resource_establishment = attrs["resource"].establishment_id
            if user_establishment and resource_establishment != user_establishment:
                raise serializers.ValidationError(
                    {
                        "resource": "Un ADMIN ne peut réserver que pour son établissement."
                    }
                )

        start_dt = datetime.combine(booking_date, start_time)
        end_dt = start_dt + timedelta(minutes=duration)
        if end_dt.time() <= start_time:
            raise serializers.ValidationError(
                {"duration": "La durée sélectionnée n'est pas valide."}
            )

        if end_dt.time() > time(22, 0):
            raise serializers.ValidationError(
                {"duration": "Le créneau dépasse l'heure de fermeture (22:00)."}
            )

        attrs["end_time"] = end_dt.time()
        attrs["total_price"] = Decimal(duration) * PRICE_PER_MINUTE
        return attrs

    def create(self, validated_data):
        validated_data.pop("duration")
        return Booking.objects.create(**validated_data)


class BookingReadSerializer(serializers.ModelSerializer):
    resource_label = serializers.CharField(source="resource.label", read_only=True)
    establishment_id = serializers.IntegerField(
        source="resource.establishment_id", read_only=True
    )
    establishment_name = serializers.CharField(
        source="resource.establishment.name", read_only=True
    )
    user_phone_number = serializers.CharField(
        source="user.phone_number", read_only=True
    )
    validated_by_admin_phone_number = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "resource",
            "resource_label",
            "establishment_id",
            "establishment_name",
            "user",
            "user_phone_number",
            "booking_date",
            "start_time",
            "end_time",
            "status",
            "total_price",
            "validated_by_admin",
            "validated_by_admin_phone_number",
            "created_at",
        ]

    def get_validated_by_admin_phone_number(self, obj):
        if obj.validated_by_admin is None:
            return None
        return obj.validated_by_admin.phone_number
