package com.url_shortener.url_shortener.urls;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FolderController.class)
@AutoConfigureMockMvc(addFilters = false)
class FolderControllerTest {

    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private FolderService folderService;
    
    @MockBean
    private UserRepository userRepository;
    @MockBean
    private com.url_shortener.url_shortener.auth.JwtService jwtService;

    @Test
    void getUserFolders_Success() throws Exception {
        FolderDto folder = new FolderDto(1L, "Work", null, 5);
        when(folderService.getUserFolders(1L)).thenReturn(List.of(folder));

        mockMvc.perform(get("/folders")
                .principal(new UsernamePasswordAuthenticationToken(1L, null, Collections.emptyList())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Work"));
    }

    @Test
    void createFolder_Success() throws Exception {
        User user = User.builder().id(1L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        
        FolderRequestDto request = new FolderRequestDto();
        request.setName("Personal");
        
        FolderDto folder = new FolderDto(2L, "Personal", null, 0);
        when(folderService.createFolder(eq("Personal"), eq(user))).thenReturn(folder);

        mockMvc.perform(post("/folders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(new UsernamePasswordAuthenticationToken(1L, null, Collections.emptyList())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Personal"));
    }

    @Test
    void deleteFolder_Success() throws Exception {
        User user = User.builder().id(1L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        mockMvc.perform(delete("/folders/1")
                .principal(new UsernamePasswordAuthenticationToken(1L, null, Collections.emptyList())))
                .andExpect(status().isNoContent());

        verify(folderService).deleteFolder(eq(1L), eq(user));
    }
}
