package com.url_shortener.url_shortener.urls;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UtmTemplateController.class)
@AutoConfigureMockMvc(addFilters = false)
class UtmTemplateControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UtmTemplateService utmTemplateService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private com.url_shortener.url_shortener.auth.JwtService jwtService;

    @Test
    void getUserTemplates_Success() throws Exception {
        UtmTemplateDto dto = UtmTemplateDto.builder()
                .id(1L)
                .name("Summer Sale")
                .source("google")
                .medium("cpc")
                .campaign("summer")
                .createdAt(LocalDateTime.now())
                .build();

        when(utmTemplateService.getUserTemplates(1L)).thenReturn(List.of(dto));

        mockMvc.perform(get("/utm-templates")
                        .principal(new UsernamePasswordAuthenticationToken(1L, null, Collections.emptyList())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Summer Sale"))
                .andExpect(jsonPath("$[0].source").value("google"));
    }

    @Test
    void createTemplate_Success() throws Exception {
        User user = User.builder().id(1L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        UtmTemplateRequest request = UtmTemplateRequest.builder()
                .name("Summer Sale")
                .source("google")
                .build();

        UtmTemplateDto dto = UtmTemplateDto.builder()
                .id(1L)
                .name("Summer Sale")
                .source("google")
                .build();

        when(utmTemplateService.createTemplate(any(UtmTemplateRequest.class), eq(user))).thenReturn(dto);

        mockMvc.perform(post("/utm-templates")
                        .principal(new UsernamePasswordAuthenticationToken(1L, null, Collections.emptyList()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.name").value("Summer Sale"));
    }

    @Test
    void updateTemplate_Success() throws Exception {
        User user = User.builder().id(1L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        UtmTemplateRequest request = UtmTemplateRequest.builder()
                .name("Updated Sale")
                .source("facebook")
                .build();

        UtmTemplateDto dto = UtmTemplateDto.builder()
                .id(1L)
                .name("Updated Sale")
                .source("facebook")
                .build();

        when(utmTemplateService.updateTemplate(eq(1L), any(UtmTemplateRequest.class), eq(user))).thenReturn(dto);

        mockMvc.perform(put("/utm-templates/1")
                        .principal(new UsernamePasswordAuthenticationToken(1L, null, Collections.emptyList()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Sale"));
    }

    @Test
    void deleteTemplate_Success() throws Exception {
        User user = User.builder().id(1L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        mockMvc.perform(delete("/utm-templates/1")
                        .principal(new UsernamePasswordAuthenticationToken(1L, null, Collections.emptyList())))
                .andExpect(status().isNoContent());

        verify(utmTemplateService).deleteTemplate(1L, user);
    }

    @Test
    void toggleDefaultTemplate_Success() throws Exception {
        User user = User.builder().id(1L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        UtmTemplateDto dto = UtmTemplateDto.builder()
                .id(1L)
                .name("Default Template")
                .isDefault(true)
                .build();

        when(utmTemplateService.toggleDefaultTemplate(eq(1L), eq(user))).thenReturn(dto);

        mockMvc.perform(patch("/utm-templates/1/default")
                        .principal(new UsernamePasswordAuthenticationToken(1L, null, Collections.emptyList())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isDefault").value(true));
    }
}
