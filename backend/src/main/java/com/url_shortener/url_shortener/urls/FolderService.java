package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.users.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FolderService {

    private final FolderRepository folderRepository;
    private final UrlRepository urlRepository;

    public List<FolderDto> getUserFolders(Long userId) {
        return folderRepository.findByUserId(userId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public FolderDto createFolder(String name, User user) {
        if (folderRepository.existsByNameIgnoreCaseAndUserId(name, user.getId())) {
            throw new FolderAlreadyExistsException();
        }

        Folder folder = Folder.builder()
                .name(name)
                .user(user)
                .build();

        Folder savedFolder = folderRepository.save(folder);
        return toDto(savedFolder);
    }

    public void deleteFolder(Long folderId, User user) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(FolderNotFoundException::new);

        if (!folder.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("You do not have permission to delete this folder.");
        }

        // Deleting the folder will trigger the DB ON DELETE SET NULL cascade for the urls table
        folderRepository.delete(folder);
    }

    public FolderDto updateFolder(Long id, FolderRequestDto request, User user) {
        Folder folder = folderRepository.findById(id)
                .orElseThrow(FolderNotFoundException::new);

        if (!folder.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("You do not have permission to edit this folder.");
        }

        String newName = request.getName().trim();
        if (!folder.getName().equalsIgnoreCase(newName)) {
            if (folderRepository.existsByNameIgnoreCaseAndUserId(newName, user.getId())) {
                throw new FolderAlreadyExistsException();
            }
            folder.setName(newName);
            folder = folderRepository.save(folder);
        }

        return toDto(folder);
    }

    private FolderDto toDto(Folder folder) {
        return new FolderDto(
                folder.getId(),
                folder.getName(),
                folder.getCreatedAt(),
                urlRepository.countByFolderId(folder.getId())
        );
    }
}
