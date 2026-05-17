from datetime import date, datetime, timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Doctor, Patient, Appointment, DoctorAvailability
from .serializers import (
    DoctorSerializer, PatientSerializer, AppointmentSerializer,
    DoctorAvailabilitySerializer, PatientProfileSerializer
)


# ─────────────────────────── DOCTOR ───────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def doctor_list(request):
    doctors = Doctor.objects.select_related('user').all()
    serializer = DoctorSerializer(doctors, many=True)
    return Response(serializer.data)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def doctor_detail(request, pk):
    try:
        doctor = Doctor.objects.get(pk=pk)
    except Doctor.DoesNotExist:
        return Response({"error": "Not Found"}, status=404)

    user = request.user
    role = user.effective_role

    if request.method in ['PUT', 'DELETE']:
        if role == 'patient' or (role == 'doctor' and doctor.user != user):
            return Response({"error": "Unauthorized"}, status=403)

    if request.method == 'GET':
        return Response(DoctorSerializer(doctor).data)
    if request.method == 'PUT':
        serializer = DoctorSerializer(doctor, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    if request.method == 'DELETE':
        doctor.delete()
        return Response({"message": "deleted"}, status=204)


# ─────────────────────────── PATIENT ───────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def patient_list(request):
    user = request.user
    role = user.effective_role

    if request.method == 'GET':
        if role == 'admin':
            patients = Patient.objects.select_related('user').all()
        elif role == 'doctor':
            doctor = getattr(user, 'doctor', None)
            if doctor:
                patient_ids = Appointment.objects.filter(doctor=doctor).values_list('patient_id', flat=True)
                patients = Patient.objects.filter(id__in=patient_ids).select_related('user')
            else:
                patients = Patient.objects.none()
        else:
            patients = Patient.objects.filter(user=user).select_related('user')
        return Response(PatientSerializer(patients, many=True).data)

    if request.method == 'POST':
        serializer = PatientSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def patient_detail(request, pk):
    try:
        patient = Patient.objects.get(pk=pk)
    except Patient.DoesNotExist:
        return Response({"error": "Not Found"}, status=404)

    user = request.user
    role = user.effective_role

    if role == 'patient' and patient.user != user:
        return Response({"error": "Unauthorized"}, status=403)
    if role == 'doctor' and request.method in ['PUT', 'DELETE']:
        return Response({"error": "Unauthorized"}, status=403)

    if request.method == 'GET':
        return Response(PatientSerializer(patient).data)
    if request.method == 'PUT':
        serializer = PatientSerializer(patient, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    if request.method == 'DELETE':
        patient.delete()
        return Response({"message": "deleted"}, status=204)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_profile(request):
    try:
        patient = Patient.objects.get(user=request.user)
    except Patient.DoesNotExist:
        return Response({"error": "Profile not found"}, status=404)
    return Response(PatientProfileSerializer(patient).data)


# ─────────────────────────── APPOINTMENT ───────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def appointment_list(request):
    user = request.user
    role = user.effective_role

    if request.method == 'GET':
        if role == 'doctor':
            appointments = Appointment.objects.filter(doctor__user=user).select_related('doctor__user', 'patient__user')
        elif role == 'patient':
            appointments = Appointment.objects.filter(patient__user=user).select_related('doctor__user', 'patient__user')
        else:
            appointments = Appointment.objects.select_related('doctor__user', 'patient__user').all()
        return Response(AppointmentSerializer(appointments, many=True).data)

    elif request.method == 'POST':
        data = request.data.copy()
        if role == 'patient' and 'patient' not in data:
            try:
                patient = Patient.objects.get(user=user)
                data['patient'] = patient.id
            except Patient.DoesNotExist:
                return Response({"error": "Patient profile not found."}, status=404)

        serializer = AppointmentSerializer(data=data)
        if serializer.is_valid():
            doctor = serializer.validated_data['doctor']
            appt_date = serializer.validated_data['date']
            appt_time = serializer.validated_data['time']

            # Check for double booking
            if Appointment.objects.filter(
                doctor=doctor, date=appt_date, time=appt_time,
                status__in=['pending', 'approved']
            ).exists():
                return Response({"error": "Doctor already booked at this time"}, status=400)

            # Validate against doctor availability slots
            day_name = appt_date.strftime('%A').lower()
            availability = DoctorAvailability.objects.filter(
                doctor=doctor, day=day_name, is_available=True
            ).first()

            if availability:
                if not (availability.start_time <= appt_time <= availability.end_time):
                    return Response(
                        {"error": f"Doctor is not available at this time. Available: {availability.start_time.strftime('%H:%M')} - {availability.end_time.strftime('%H:%M')}"},
                        status=400
                    )

            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def appointment_detail(request, pk):
    try:
        appointment = Appointment.objects.get(pk=pk)
    except Appointment.DoesNotExist:
        return Response({"error": "Not Found"}, status=404)

    user = request.user
    role = user.effective_role

    if role == 'patient' and appointment.patient.user != user:
        return Response({"error": "Unauthorized"}, status=403)
    if role == 'doctor' and appointment.doctor.user != user:
        return Response({"error": "Unauthorized"}, status=403)

    if request.method == 'GET':
        return Response(AppointmentSerializer(appointment).data)

    if request.method in ['PUT', 'PATCH']:
        if role == 'doctor':
            DOCTOR_ALLOWED_STATUSES = ['approved', 'rejected', 'cancelled', 'rescheduled', 'completed']
            new_status = request.data.get('status')
            if new_status and new_status not in DOCTOR_ALLOWED_STATUSES:
                return Response({"error": "Invalid status"}, status=400)
        serializer = AppointmentSerializer(appointment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if request.method == 'DELETE':
        appointment.delete()
        return Response({"message": "deleted"}, status=204)


# ─────────────────────────── APPOINTMENT STATS ───────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def appointment_stats(request):
    """Returns appointment statistics scoped to the user's role."""
    user = request.user
    role = user.effective_role
    today = date.today()

    if role == 'doctor':
        qs = Appointment.objects.filter(doctor__user=user)
    elif role == 'patient':
        qs = Appointment.objects.filter(patient__user=user)
    else:
        qs = Appointment.objects.all()

    stats = {
        "total":      qs.count(),
        "pending":    qs.filter(status='pending').count(),
        "approved":   qs.filter(status='approved').count(),
        "completed":  qs.filter(status='completed').count(),
        "cancelled":  qs.filter(status='cancelled').count(),
        "rejected":   qs.filter(status='rejected').count(),
        "today":      qs.filter(date=today).count(),
    }
    return Response(stats)


# ─────────────────────────── DOCTOR AVAILABILITY ───────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def availability_list(request):
    """
    GET  – a doctor sees their own slots; admin sees all.
    POST – only doctors can create their own slots.
    """
    user = request.user
    role = user.effective_role

    if request.method == 'GET':
        if role == 'admin':
            slots = DoctorAvailability.objects.select_related('doctor__user').all()
        elif role == 'doctor':
            doctor = getattr(user, 'doctor', None)
            slots = DoctorAvailability.objects.filter(doctor=doctor) if doctor else DoctorAvailability.objects.none()
        else:
            return Response({"error": "Unauthorized"}, status=403)
        return Response(DoctorAvailabilitySerializer(slots, many=True).data)

    if request.method == 'POST':
        if role != 'doctor':
            return Response({"error": "Only doctors can set availability"}, status=403)
        doctor = getattr(user, 'doctor', None)
        if not doctor:
            return Response({"error": "Doctor profile not found"}, status=404)

        data = request.data.copy()
        data['doctor'] = doctor.id

        # Prevent duplicate day entries — update instead
        existing = DoctorAvailability.objects.filter(doctor=doctor, day=data.get('day')).first()
        if existing:
            serializer = DoctorAvailabilitySerializer(existing, data=data, partial=True)
        else:
            serializer = DoctorAvailabilitySerializer(data=data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def availability_detail(request, pk):
    try:
        slot = DoctorAvailability.objects.get(pk=pk)
    except DoctorAvailability.DoesNotExist:
        return Response({"error": "Not Found"}, status=404)

    user = request.user
    role = user.effective_role

    if role == 'doctor' and slot.doctor.user != user:
        return Response({"error": "Unauthorized"}, status=403)
    if role == 'patient':
        return Response({"error": "Unauthorized"}, status=403)

    if request.method == 'GET':
        return Response(DoctorAvailabilitySerializer(slot).data)
    if request.method == 'PUT':
        serializer = DoctorAvailabilitySerializer(slot, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    if request.method == 'DELETE':
        slot.delete()
        return Response({"message": "deleted"}, status=204)


# ─────────────────────────── AVAILABLE SLOTS (for booking) ───────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_slots(request):
    """
    GET /api/clinic/available-slots/?doctor=<id>&date=<YYYY-MM-DD>
    Returns 30-minute time slots within the doctor's availability,
    excluding already-booked times.
    """
    doctor_id = request.query_params.get('doctor')
    date_str  = request.query_params.get('date')

    if not doctor_id or not date_str:
        return Response({"error": "doctor and date query params required"}, status=400)

    try:
        doctor = Doctor.objects.get(pk=doctor_id)
        appt_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except (Doctor.DoesNotExist, ValueError):
        return Response({"error": "Invalid doctor or date"}, status=400)

    # Find doctor's availability for that day of week
    day_name = appt_date.strftime('%A').lower()
    availability = DoctorAvailability.objects.filter(
        doctor=doctor, day=day_name, is_available=True
    ).first()

    if not availability or not availability.start_time or not availability.end_time:
        return Response({"slots": [], "message": "Doctor is not available on this day"})

    # Generate 30-min slots
    slots = []
    current = datetime.combine(appt_date, availability.start_time)
    end     = datetime.combine(appt_date, availability.end_time)

    while current + timedelta(minutes=30) <= end:
        slots.append(current.strftime('%H:%M'))
        current += timedelta(minutes=30)

    # Remove already-booked slots
    booked_times = set(
        Appointment.objects.filter(
            doctor=doctor, date=appt_date,
            status__in=['pending', 'approved']
        ).values_list('time', flat=True)
    )
    booked_str = {t.strftime('%H:%M') if hasattr(t, 'strftime') else str(t)[:5] for t in booked_times}

    available = [s for s in slots if s not in booked_str]

    return Response({
        "slots": available,
        "availability": {
            "day": day_name,
            "start": availability.start_time.strftime('%H:%M'),
            "end": availability.end_time.strftime('%H:%M'),
        }
    })
