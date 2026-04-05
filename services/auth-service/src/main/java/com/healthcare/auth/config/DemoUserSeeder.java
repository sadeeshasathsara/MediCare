package com.healthcare.auth.config;

import com.healthcare.auth.model.UserAccount;
import com.healthcare.auth.model.UserRole;
import com.healthcare.auth.repository.UserAccountRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class DemoUserSeeder {

    private final UserAccountRepository repo;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;

    public DemoUserSeeder(UserAccountRepository repo, PasswordEncoder passwordEncoder, Environment environment) {
        this.repo = repo;
        this.passwordEncoder = passwordEncoder;
        this.environment = environment;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void seed() {
        boolean enabled = Boolean.parseBoolean(environment.getProperty("auth.seed-demo-users", "true"));
        if (!enabled)
            return;

        String password = environment.getProperty("auth.demo.password", "demo123");
        seedOne("admin@medicare.com", UserRole.ADMIN, password);
        seedOne("doctor@medicare.com", UserRole.DOCTOR, password);
        seedOne("patient@medicare.com", UserRole.PATIENT, password);
    }

    private void seedOne(String email, UserRole role, String passwordRaw) {
        String normalized = email.trim().toLowerCase();
        if (repo.existsByEmail(normalized))
            return;

        Instant now = Instant.now();
        UserAccount u = new UserAccount();
        u.setEmail(normalized);
        u.setRole(role);
        u.setPasswordHash(passwordEncoder.encode(passwordRaw));
        u.setCreatedAt(now);
        u.setUpdatedAt(now);
        repo.save(u);
    }
}
