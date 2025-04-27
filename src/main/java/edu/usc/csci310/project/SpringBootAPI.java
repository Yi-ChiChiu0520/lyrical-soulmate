package edu.usc.csci310.project;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.client.RestTemplate;

@Controller
@SpringBootApplication
public class SpringBootAPI {

    public static void main(String[] args) {
        // load the env with the API key
        Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
        String geniusAccessToken = dotenv.get("GENIUS_ACCESS_TOKEN");

        // set the genius access token as a system property
        if (geniusAccessToken == null) {
            System.err.println("Error: GENIUS_ACCESS_TOKEN not found in .env file.");
            System.exit(1);
        } else {
            System.setProperty("GENIUS_ACCESS_TOKEN", geniusAccessToken);
        }

        SpringApplication.run(SpringBootAPI.class, args);
    }

    @RequestMapping(value = "{_:^(?!index\\.html|api).*$}")
    public String redirect() {
        // Forward to home page so that route is preserved.(i.e forward:/index.html)
        return "forward:/";
    }
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}