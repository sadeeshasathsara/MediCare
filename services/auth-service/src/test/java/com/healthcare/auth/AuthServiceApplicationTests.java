package com.healthcare.auth;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"auth.seed-demo-users=false"
})
class AuthServiceApplicationTests {

	@Test
	void contextLoads() {
	}

}
