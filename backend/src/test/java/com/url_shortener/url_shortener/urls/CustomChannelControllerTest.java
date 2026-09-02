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

@WebMvcTest(CustomChannelController.class)
@AutoConfigureMockMvc(addFilters = false)
class CustomChannelControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CustomChannelService customChannelService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private com.url_shortener.url_shortener.auth.JwtService jwtService;

    @Test
    void getUserCustomChannels_Success() throws Exception {
        CustomChannelDto dto = CustomChannelDto.builder()
                .id(1L)
                .name("Reddit")
                .utmSource("reddit")
                .utmMedium("social")
                .createdAt(LocalDateTime.now())
                .build();

        when(customChannelService.getUserCustomChannels(1L)).thenReturn(List.of(dto));

        mockMvc.perform(get("/custom-channels")
                        .principal(new UsernamePasswordAuthenticationToken(1L, null, Collections.emptyList())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Reddit"))
                .andExpect(jsonPath("$[0].utmSource").value("reddit"))
                .andExpect(jsonPath("$[0].utmMedium").value("social"));
    }

    @Test
    void createCustomChannel_Success() throws Exception {
        CustomChannelRequest request = CustomChannelRequest.builder()
                .name("Discord")
                .utmSource("discord")
                .utmMedium("community")
                .build();

        User user = User.builder().id(1L).email("test@example.com").build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        CustomChannelDto dto = CustomChannelDto.builder()
                .id(2L)
                .name("Discord")
                .utmSource("discord")
                .utmMedium("community")
                .createdAt(LocalDateTime.now())
                .build();

        when(customChannelService.createCustomChannel(any(CustomChannelRequest.class), eq(user))).thenReturn(dto);

        mockMvc.perform(post("/custom-channels")
                        .principal(new UsernamePasswordAuthenticationToken(1L, null, Collections.emptyList()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(2L))
                .andExpect(jsonPath("$.name").value("Discord"));
    }

    @Test
    void deleteCustomChannel_Success() throws Exception {
        User user = User.builder().id(1L).email("test@example.com").build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        mockMvc.perform(delete("/custom-channels/2")
                        .principal(new UsernamePasswordAuthenticationToken(1L, null, Collections.emptyList())))
                .andExpect(status().isNoContent());

        verify(customChannelService).deleteCustomChannel(2L, user);
    }
}
