from rest_framework import serializers
from .models import Doctor, Patient, Appointment, DoctorAvailability


class DoctorSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = Doctor
        fields = [
         'id', 'user', 'username', 'specialization', 'experience',
         'gender', 'phone', 'bio', 'is_available', 'created_at'
        ]


class PatientSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = Patient
        fields = [
            'id', 'user', 'username', 'age', 'gender', 'phone',
            'height', 'weight', 'address', 'blood_group',
            'medical_conditions', 'created_at'
        ]


class AppointmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.user.username', read_only=True)
    patient_name = serializers.CharField(source='patient.user.username', read_only=True)
    doctor_info = serializers.StringRelatedField(source='doctor', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'doctor', 'doctor_name', 'doctor_info', 'patient',
            'patient_name', 'date', 'time', 'description', 'comments',
            'diagnosis', 'prescription', 'status', 'created_at', 'updated_at'
        ]


# NEW: Doctor Availability Serializer
class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.user.username', read_only=True)

    class Meta:
        model = DoctorAvailability
        fields = ['id', 'doctor', 'doctor_name', 'day', 'start_time', 'end_time', 'is_available']


# Patient Profile Serializer
class PatientProfileSerializer(serializers.ModelSerializer):
    username   = serializers.CharField(source='user.username', read_only=True)
    email      = serializers.EmailField(source='user.email')
    first_name = serializers.CharField(source='user.first_name', allow_blank=True)
    last_name  = serializers.CharField(source='user.last_name', allow_blank=True)

    class Meta:
        model = Patient
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'age', 'gender', 'phone', 'height', 'weight',
            'address', 'blood_group', 'medical_conditions',
        ]

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        for attr, value in user_data.items():
            setattr(instance.user, attr, value)
        instance.user.save()
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
