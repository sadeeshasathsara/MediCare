package com.healthcare.auth.repository;

import com.healthcare.auth.model.UserAccount;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserAccountRepository extends MongoRepository<UserAccount, String> {
    Optional<UserAccount> findByEmail(String email);

    boolean existsByEmail(String email);
}
