package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.users.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FolderServiceTest {

    @Mock
    private FolderRepository folderRepository;
    @Mock
    private UrlRepository urlRepository;

    @InjectMocks
    private FolderService folderService;

    @Test
    void createFolder_Success() {
        User user = User.builder().id(1L).build();
        Folder folder = Folder.builder().id(10L).name("My Folder").user(user).build();

        when(folderRepository.existsByNameIgnoreCaseAndUserId("My Folder", 1L)).thenReturn(false);
        when(folderRepository.save(any(Folder.class))).thenReturn(folder);
        when(urlRepository.countByFolderId(10L)).thenReturn(0);

        FolderDto dto = folderService.createFolder("My Folder", user);

        assertThat(dto.getName()).isEqualTo("My Folder");
        verify(folderRepository).save(any(Folder.class));
    }

    @Test
    void createFolder_Conflict() {
        User user = User.builder().id(1L).build();
        when(folderRepository.existsByNameIgnoreCaseAndUserId("Duplicate", 1L)).thenReturn(true);

        assertThatThrownBy(() -> folderService.createFolder("Duplicate", user))
                .isInstanceOf(FolderAlreadyExistsException.class);
    }

    @Test
    void deleteFolder_Success() {
        User user = User.builder().id(1L).build();
        Folder folder = Folder.builder().id(10L).name("My Folder").user(user).build();

        when(folderRepository.findById(10L)).thenReturn(Optional.of(folder));

        folderService.deleteFolder(10L, user);

        verify(folderRepository).delete(folder);
    }
}
