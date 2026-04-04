package com.healthcare.patient.service;

import com.healthcare.patient.dto.PatientProfileDto;
import com.healthcare.patient.dto.UpdatePatientProfileRequest;
import com.healthcare.patient.model.Patient;
import com.healthcare.patient.model.PatientStatus;
import com.healthcare.patient.repository.PatientRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Service
public class PatientProfileService {

    private final PatientRepository patientRepository;

    public PatientProfileService(PatientRepository patientRepository) {
        this.patientRepository = patientRepository;
    }

    public PatientProfileDto getProfile(String userId) {
        AccessGuard.requireSelfOrAdmin(userId);
        Patient patient = patientRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultProfile(userId));
        return toDto(patient);
    }

    public PatientProfileDto updateProfile(String userId, UpdatePatientProfileRequest request) {
        AccessGuard.requireSelfOrAdmin(userId);

        Patient patient = patientRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultProfile(userId));

        if (request.getEmail() != null) {
            patient.setEmail(request.getEmail().trim());
        }
        if (request.getName() != null) {
            patient.setName(request.getName().trim());
        }
        if (request.getDob() != null) {
            patient.setDob(request.getDob().trim());
        }

        if (request.getContact() != null) {
            Patient.Contact c = patient.getContact();
            if (c == null)
                c = new Patient.Contact();
            if (request.getContact().getPhone() != null) {
                c.setPhone(request.getContact().getPhone().trim());
            }
            patient.setContact(c);
        }

        if (request.getAddress() != null) {
            Patient.Address a = patient.getAddress();
            if (a == null)
                a = new Patient.Address();
            if (request.getAddress().getLine1() != null)
                a.setLine1(request.getAddress().getLine1().trim());
            if (request.getAddress().getLine2() != null)
                a.setLine2(request.getAddress().getLine2().trim());
            if (request.getAddress().getCity() != null)
                a.setCity(request.getAddress().getCity().trim());
            if (request.getAddress().getState() != null)
                a.setState(request.getAddress().getState().trim());
            if (request.getAddress().getPostalCode() != null)
                a.setPostalCode(request.getAddress().getPostalCode().trim());
            if (request.getAddress().getCountry() != null)
                a.setCountry(request.getAddress().getCountry().trim());
            patient.setAddress(a);
        }

        patient.setUpdatedAt(Instant.now());
        Patient saved = patientRepository.save(patient);
        return toDto(saved);
    }

    public void softDeletePatient(String userId) {
        AccessGuard.requireAdmin();
        Patient patient = patientRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "patient not found"));

        Instant now = Instant.now();
        patient.setStatus(PatientStatus.INACTIVE);
        patient.setDeletedAt(now);
        patient.setUpdatedAt(now);
        patientRepository.save(patient);
    }

    public Page<PatientProfileDto> listPatients(Pageable pageable) {
        AccessGuard.requireAdmin();
        return patientRepository.findAll(pageable).map(this::toDto);
    }

    public PatientProfileDto setStatus(String userId, PatientStatus status) {
        AccessGuard.requireAdmin();
        Patient patient = patientRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "patient not found"));

        patient.setStatus(status);
        patient.setUpdatedAt(Instant.now());
        return toDto(patientRepository.save(patient));
    }

    private Patient createDefaultProfile(String userId) {
        Instant now = Instant.now();
        Patient p = new Patient();
        p.setUserId(userId);
        p.setStatus(PatientStatus.ACTIVE);
        p.setCreatedAt(now);
        p.setUpdatedAt(now);
        return patientRepository.save(p);
    }

    private PatientProfileDto toDto(Patient p) {
        PatientProfileDto dto = new PatientProfileDto();
        dto.setUserId(p.getUserId());
        dto.setEmail(p.getEmail());
        dto.setName(p.getName());
        dto.setDob(p.getDob());
        dto.setStatus(p.getStatus());
        dto.setDeletedAt(p.getDeletedAt());
        dto.setCreatedAt(p.getCreatedAt());
        dto.setUpdatedAt(p.getUpdatedAt());

        if (p.getContact() != null) {
            PatientProfileDto.ContactDto c = new PatientProfileDto.ContactDto();
            c.setPhone(p.getContact().getPhone());
            dto.setContact(c);
        }

        if (p.getAddress() != null) {
            PatientProfileDto.AddressDto a = new PatientProfileDto.AddressDto();
            a.setLine1(p.getAddress().getLine1());
            a.setLine2(p.getAddress().getLine2());
            a.setCity(p.getAddress().getCity());
            a.setState(p.getAddress().getState());
            a.setPostalCode(p.getAddress().getPostalCode());
            a.setCountry(p.getAddress().getCountry());
            dto.setAddress(a);
        }

        return dto;
    }
}
