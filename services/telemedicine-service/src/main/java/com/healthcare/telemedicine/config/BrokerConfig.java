package com.healthcare.telemedicine.config;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.healthcare.telemedicine.event.BrokerProperties;

@Configuration
public class BrokerConfig {

    @Bean
    public TopicExchange telemedicineExchange(BrokerProperties brokerProperties) {
        return new TopicExchange(brokerProperties.getExchange(), true, false);
    }
}
