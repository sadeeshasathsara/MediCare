package com.healthcare.auth.config;

import com.healthcare.auth.model.DoctorVerificationStatus;
import com.healthcare.auth.model.Role;
import com.healthcare.auth.model.User;
import com.healthcare.auth.model.UserStatus;
import com.healthcare.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Locale;

@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private final boolean enabled;
    private final String email;
    private final String password;
    private final String fullName;

    public AdminBootstrap(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${admin.bootstrap.enabled:false}") boolean enabled,
            @Value("${admin.bootstrap.email:}") String email,
            @Value("${admin.bootstrap.password:}") String password,
            @Value("${admin.bootstrap.full-name:Admin}") String fullName) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.enabled = enabled;
        this.email = email;
        this.password = password;
        this.fullName = fullName;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }

        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail.isBlank() || password == null || password.isBlank()) {
            log.warn(
                    "Admin bootstrap enabled but ADMIN_BOOTSTRAP_EMAIL or ADMIN_BOOTSTRAP_PASSWORD is missing; skipping admin creation");
            return;
        }

        userRepository.findByEmail(normalizedEmail).ifPresentOrElse(existing -> {
            if (existing.getRole() == Role.ADMIN) {
                log.info("Admin bootstrap: ADMIN already exists (email={})", normalizedEmail);
            } else {
                log.warn("Admin bootstrap: user exists with email={} but role={} (not overwriting)", normalizedEmail,
                        existing.getRole());
            }
        }, () -> {
            Instant now = Instant.now();

            User admin = new User();
            admin.setEmail(normalizedEmail);
            admin.setFullName((fullName == null || fullName.isBlank()) ? "Admin" : fullName.trim());
            admin.setPasswordHash(passwordEncoder.encode(password));
            admin.setRole(Role.ADMIN);
            admin.setDoctorVerified(true);
            admin.setDoctorVerificationStatus(DoctorVerificationStatus.APPROVED);
            admin.setDoctorProfile(null);
            admin.setStatus(UserStatus.ACTIVE);
            admin.setCreatedAt(now);
            admin.setUpdatedAt(now);

            userRepository.save(admin);
            log.info("Admin bootstrap: created ADMIN user (email={})", normalizedEmail);
        });
    }

    private static String normalizeEmail(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }
}
