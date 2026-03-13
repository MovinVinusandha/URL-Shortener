package com.url_shortener.url_shortener.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Async configuration for non-blocking analytics tracking.
 * <p>
 * Click events are recorded on a dedicated thread pool so that URL redirect
 * latency is not impacted by database writes or IP geo-lookups.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Value("${analytics.async.core-pool-size:4}")
    private int corePoolSize;

    @Value("${analytics.async.max-pool-size:16}")
    private int maxPoolSize;

    @Value("${analytics.async.queue-capacity:500}")
    private int queueCapacity;

    /**
     * Dedicated executor for click analytics tasks.
     * Annotated methods with {@code @Async("analyticsExecutor")} will run on this pool.
     */
    @Bean(name = "analyticsExecutor")
    public Executor analyticsExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix("analytics-worker-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }
}
