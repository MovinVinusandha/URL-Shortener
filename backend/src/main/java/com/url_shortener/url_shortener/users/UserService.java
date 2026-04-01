package com.url_shortener.url_shortener.users;

import lombok.AllArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import org.springframework.transaction.annotation.Transactional;
import com.url_shortener.url_shortener.urls.FolderRepository;
import com.url_shortener.url_shortener.urls.TagRepository;
import com.url_shortener.url_shortener.urls.UrlRepository;
import com.url_shortener.url_shortener.analytics.ClickEventRepository;

@Service
@AllArgsConstructor
public class UserService {
    private final UserMapper userMapper;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ClickEventRepository clickEventRepository;
    private final UrlRepository urlRepository;
    private final TagRepository tagRepository;
    private final FolderRepository folderRepository;

    public UserDto registerUser(UserRegister userRegister) {
        isUserExistInDatabase(userRegister.getEmail());

        var user = userMapper.toEntity(userRegister);
        user.setPassword(passwordEncoder.encode(userRegister.getPassword()));
        user.setRole(Role.USER);
        userRepository.save(user);
        return userMapper.toDto(user);
    }

    public List<UserDto> getAllUsers(String sortBy) {
        if (!Set.of("name", "email", "id").contains(sortBy))
            sortBy = "id";

        return userRepository.findAll(Sort.by(sortBy))
                .stream()
                .map(userMapper::toDto)
                .toList();
    }

    public User updateUser(String publicId, UpdateUserRequest request) {
        var userId = getUserId();

        var user = userRepository.findByPublicId(publicId).orElseThrow(UserNotFoundException::new);
        
        isIdIdentical(user.getId(), userId);

        if (userRepository.existsUserByEmail(request.getEmail()) && !(user.getEmail().equals(request.getEmail()))) {
            throw new UserAlreadyExist();
        }

        if (request.getName() == null) {
            request.setName(user.getName());
        }
        if (request.getEmail() == null) {
            request.setEmail(user.getEmail());
        }

        userMapper.update(request, user);
        userRepository.save(user);
        return user;
    }

    public void deleteUser(String publicId) {
        var userId = getUserId();

        var user = userRepository.findByPublicId(publicId).orElseThrow(UserNotFoundException::new);
        
        isIdIdentical(user.getId(), userId);

        userRepository.delete(user);
    }

    public User updateMe(UserUpdateRequestDto request) {
        var userId = getUserId();
        var user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        if (!user.getEmail().equals(request.getEmail())) {
            if (userRepository.existsUserByEmail(request.getEmail())) {
                throw new UserAlreadyExist();
            }
        }

        user.setName(request.getName());
        user.setEmail(request.getEmail());
        userRepository.save(user);
        return user;
    }

    public void changePassword(PasswordChangeRequestDto request) {
        var userId = getUserId();
        var user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Incorrect current password");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Transactional
    public void deleteMe() {
        var userId = getUserId();
        var user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        clickEventRepository.deleteByUserId(userId);
        urlRepository.deleteAll(urlRepository.findByUserId(userId));
        
        var tags = tagRepository.findByUser(user);
        for (var tag : tags) {
            tagRepository.deleteTagAssociations(tag.getId());
        }
        tagRepository.deleteAll(tags);
        
        folderRepository.deleteAll(folderRepository.findByUserId(userId));
        userRepository.delete(user);
    }

    private static Long getUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return (Long) authentication.getPrincipal();
    }

    private void isUserExistInDatabase(String email) {
        if (userRepository.existsUserByEmail(email)) {
            throw new UserAlreadyExist();
        }
    }

    private static void isIdIdentical(Long id, Long userId) {
        if (!id.equals(userId)) {
            throw new UserNotFoundException();
        }
    }
}
