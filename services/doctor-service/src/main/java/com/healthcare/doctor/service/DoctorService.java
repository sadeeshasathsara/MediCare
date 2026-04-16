package com.healthcare.doctor.service;

import com.healthcare.doctor.dto.DoctorResponse;
import com.healthcare.doctor.dto.UpdateDoctorRequest;
import com.healthcare.doctor.model.Doctor;
import com.healthcare.doctor.repository.DoctorRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
public class DoctorService {

    private final DoctorRepository doctorRepository;

    public DoctorService(DoctorRepository doctorRepository) {
        this.doctorRepository = doctorRepository;
    }

    public DoctorResponse getDoctorById(String id) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found"));
        return toResponse(doctor);
    }

    public DoctorResponse updateDoctor(String id, UpdateDoctorRequest request) {
        Doctor doctor = doctorRepository.findById(id).orElseGet(() -> {
            Doctor newDoctor = new Doctor();
            newDoctor.setId(id);
            newDoctor.setUserId(id);
            // Default to true. In a real system, verification status should be synced from auth-service headers.
            newDoctor.setVerified(true);
            newDoctor.setCreatedAt(Instant.now());
            return newDoctor;
        });

        boolean changed = true; // Since we might be creating it

        if (request.getBio() != null) {
            doctor.setBio(request.getBio().trim());
        }
        if (request.getQualifications() != null) {
            doctor.setQualifications(request.getQualifications());
        }
        if (request.getSpecialty() != null) {
            String specialty = request.getSpecialty().trim();
            if (specialty.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "specialty cannot be blank");
            }
            doctor.setSpecialty(specialty);
        }
        if (request.getConsultationFee() != null) {
            if (request.getConsultationFee() < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "consultationFee must be zero or positive");
            }
            doctor.setConsultationFee(request.getConsultationFee());
        }
        if (request.getPhone() != null) {
            doctor.setPhone(request.getPhone().trim());
        }
        if (request.getFullName() != null) {
            String fullName = request.getFullName().trim();
            if (fullName.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fullName cannot be blank");
            }
            doctor.setFullName(fullName);
        }

        if (!changed) {
            return toResponse(doctor);
        }

        doctor.setUpdatedAt(Instant.now());
        Doctor saved = doctorRepository.save(doctor);
        return toResponse(saved);
    }

    public List<DoctorResponse> listVerifiedDoctors(String specialty) {
        List<Doctor> doctors;
        if (specialty != null && !specialty.isBlank()) {
            doctors = doctorRepository.findByVerifiedTrueAndSpecialtyIgnoreCase(specialty.trim());
        } else {
            doctors = doctorRepository.findByVerifiedTrue();
        }
        return doctors.stream().map(this::toResponse).toList();
    }

    public Page<DoctorResponse> searchVerifiedDoctors(String search, String specialty, int page, int limit) {
        Pageable pageable = PageRequest.of(page, limit, Sort.by("fullName").ascending());
        
        String searchRegex = (search != null && !search.trim().isEmpty()) ? ".*" + search.trim() + ".*" : ".*";
        String specialtyRegex = (specialty != null && !specialty.trim().isEmpty()) ? "^" + specialty.trim() + "$" : ".*";

        Page<Doctor> doctorPage = doctorRepository.searchDoctors(searchRegex, specialtyRegex, pageable);
        return doctorPage.map(this::toResponse);
    }

    public List<String> listSpecialties() {
        List<Doctor> verifiedDoctors = doctorRepository.findByVerifiedTrue();
        return verifiedDoctors.stream()
                .map(Doctor::getSpecialty)
                .filter(s -> s != null && !s.isBlank())
                .distinct()
                .sorted()
                .toList();
    }

    /**
     * Called internally to ensure a doctor document exists for a given userId.
     * If not found, creates a stub doctor record.
     */
    public Doctor ensureDoctorExists(String doctorId) {
        return doctorRepository.findById(doctorId).orElseGet(() -> {
            Doctor newDoctor = new Doctor();
            newDoctor.setId(doctorId);
            newDoctor.setUserId(doctorId);
            newDoctor.setVerified(true);
            newDoctor.setCreatedAt(Instant.now());
            newDoctor.setUpdatedAt(Instant.now());
            return doctorRepository.save(newDoctor);
        });
    }

    private DoctorResponse toResponse(Doctor doctor) {
        DoctorResponse response = new DoctorResponse();
        response.setId(doctor.getId());
        response.setUserId(doctor.getUserId());
        response.setFullName(doctor.getFullName());
        response.setEmail(doctor.getEmail());
        response.setPhone(doctor.getPhone());
        response.setSpecialty(doctor.getSpecialty());
        response.setBio(doctor.getBio());
        response.setQualifications(doctor.getQualifications());
        response.setLicenseNumber(doctor.getLicenseNumber());
        response.setConsultationFee(doctor.getConsultationFee());
        response.setVerified(doctor.isVerified());
        response.setCreatedAt(doctor.getCreatedAt());
        response.setUpdatedAt(doctor.getUpdatedAt());
        return response;
    }
}
