package com.url_shortener.url_shortener.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.url_shortener.url_shortener.auth.LoginRequest;
import com.url_shortener.url_shortener.config.TestRedisConfig;
import com.url_shortener.url_shortener.urls.FolderRequestDto;
import com.url_shortener.url_shortener.urls.TagRequest;
import com.url_shortener.url_shortener.urls.UrlRequest;
import com.url_shortener.url_shortener.users.PasswordChangeRequestDto;
import com.url_shortener.url_shortener.users.UserRegister;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestRedisConfig.class)
class FullBackendFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void fullUserLifecycleTest() throws Exception {
        // 1. Register new user
        UserRegister userRegister = new UserRegister("Integration User", "integration@example.com", "Password123!");
        
        mockMvc.perform(post("/user")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(userRegister)))
                .andExpect(status().isOk());

        // 2. Login -> receive Access Token
        LoginRequest loginRequest = new LoginRequest("integration@example.com", "Password123!");
        
        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andReturn();
        
        String loginResponse = loginResult.getResponse().getContentAsString();
        String token = JsonPath.read(loginResponse, "$.token");
        String bearerToken = "Bearer " + token;

        // 3. Create Folder
        FolderRequestDto folderRequest = new FolderRequestDto();
        folderRequest.setName("Integration Folder");
        
        MvcResult folderResult = mockMvc.perform(post("/api/folders")
                .header("Authorization", bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(folderRequest)))
                .andExpect(status().isCreated())
                .andReturn();
        Integer folderId = JsonPath.read(folderResult.getResponse().getContentAsString(), "$.id");

        // 4. Create Tag
        TagRequest tagRequest = new TagRequest();
        tagRequest.setName("Integration Tag");
        tagRequest.setColor("#000000");

        MvcResult tagResult = mockMvc.perform(post("/api/tags")
                .header("Authorization", bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(tagRequest)))
                .andExpect(status().isCreated())
                .andReturn();
        Integer tagId = JsonPath.read(tagResult.getResponse().getContentAsString(), "$.id");

        // 5. Shorten URL with custom alias, folder, and tags
        UrlRequest urlRequest = new UrlRequest("https://example.com/integration-test", "int-test-alias", null, null, java.util.List.of(tagId.longValue()), folderId.longValue());
        
        mockMvc.perform(post("/shorten")
                .header("Authorization", bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(urlRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shortUrl").value("http://localhost:8080/int-test-alias"));

        // 6. Hit redirect endpoint (Wait for async tracking logic)
        mockMvc.perform(get("/int-test-alias"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://example.com/integration-test"));

        // Wait a bit for the async @Async click event to be persisted
        Thread.sleep(1500);

        // 7. Fetch overall analytics
        mockMvc.perform(get("/api/analytics")
                .header("Authorization", bearerToken)
                .param("period", "all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalClicks").value(1));

        // 8. Change password
        PasswordChangeRequestDto pwdRequest = new PasswordChangeRequestDto("Password123!", "NewPassword123!");
        mockMvc.perform(put("/api/users/me/password")
                .header("Authorization", bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(pwdRequest)))
                .andExpect(status().isNoContent());

        // 9. Delete account
        mockMvc.perform(delete("/api/users/me")
                .header("Authorization", bearerToken))
                .andExpect(status().isNoContent());
                
        // 10. Verify login fails after deletion
        LoginRequest loginRequest2 = new LoginRequest("integration@example.com", "NewPassword123!");
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest2)))
                .andExpect(status().isUnauthorized());
    }
}
