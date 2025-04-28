package edu.usc.csci310.project.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;

import java.util.Properties;

@Configuration
public class DotenvConfiguration {
    @Bean
    public static PropertySourcesPlaceholderConfigurer dotenvConfigurer() {
        Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();

        Properties props = new Properties();
        dotenv.entries().forEach(e -> props.put(e.getKey(), e.getValue()));

        PropertySourcesPlaceholderConfigurer cfg = new PropertySourcesPlaceholderConfigurer();
        cfg.setProperties(props);
        return cfg;
    }
}
