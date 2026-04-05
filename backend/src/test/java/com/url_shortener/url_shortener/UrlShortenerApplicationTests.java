package com.url_shortener.url_shortener;

import com.url_shortener.url_shortener.config.TestRedisConfig;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest
@Import(TestRedisConfig.class)
class UrlShortenerApplicationTests {

	@Test
	void contextLoads() {
	}

}
