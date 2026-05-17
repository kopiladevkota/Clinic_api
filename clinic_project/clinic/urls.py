from django.urls import path
from .views import (
    doctor_list, doctor_detail,
    patient_list, patient_detail, patient_profile,
    appointment_list, appointment_detail, appointment_stats,
    availability_list, availability_detail, available_slots,
)

urlpatterns = [
    # Doctors
    path('doctors/', doctor_list),
    path('doctors/<int:pk>/', doctor_detail, name='doctor_detail'),

    # Patients
    path('patient/', patient_list, name='patient-list'),
    path('patient/<int:pk>/', patient_detail),
    path('patient/profile/', patient_profile, name='patient-profile'),

    # Appointments
    path('appointment/', appointment_list, name='appointment-list'),
    path('appointment/<int:pk>/', appointment_detail, name='appointment-detail'),
    path('appointment/stats/', appointment_stats, name='appointment-stats'),

    # Doctor Availability
    path('availability/', availability_list, name='availability-list'),
    path('availability/<int:pk>/', availability_detail, name='availability-detail'),
    path('available-slots/', available_slots, name='available-slots'),
]
