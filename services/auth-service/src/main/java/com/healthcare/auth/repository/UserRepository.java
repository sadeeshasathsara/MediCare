package com.healthcare.auth.repository;

import com.healthcare.auth.model.DoctorVerificationStatus;
import com.healthcare.auth.model.Role;
import com.healthcare.auth.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    List<User> findByRole(Role role);

    List<User> findByRoleAndDoctorVerificationStatus(Role role, DoctorVerificationStatus status);
}
