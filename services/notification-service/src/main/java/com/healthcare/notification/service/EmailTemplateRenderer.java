package com.healthcare.notification.service;

import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.util.FileCopyUtils;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class EmailTemplateRenderer {

    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("\\{\\{\\s*([a-zA-Z0-9_.-]+)\\s*\\}\\}");
    private final ResourceLoader resourceLoader;
    private final Map<String, String> templateCache = new ConcurrentHashMap<>();

    public EmailTemplateRenderer(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    public String render(String templateName, Map<String, Object> values) {
        String template = templateCache.computeIfAbsent(templateName, this::loadTemplate);

        Matcher matcher = PLACEHOLDER_PATTERN.matcher(template);
        StringBuffer out = new StringBuffer();
        while (matcher.find()) {
            String key = matcher.group(1);
            Object rawValue = values == null ? null : values.get(key);
            String renderedValue = rawValue == null ? "" : String.valueOf(rawValue);
            matcher.appendReplacement(out, Matcher.quoteReplacement(renderedValue));
        }
        matcher.appendTail(out);
        return out.toString();
    }

    private String loadTemplate(String templateName) {
        String path = "classpath:templates/email/" + templateName + ".html";
        Resource resource = resourceLoader.getResource(path);
        if (!resource.exists()) {
            throw new IllegalArgumentException("Email template not found: " + templateName);
        }
        try (Reader reader = new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8)) {
            return FileCopyUtils.copyToString(reader);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to load template: " + templateName, ex);
        }
    }
}
