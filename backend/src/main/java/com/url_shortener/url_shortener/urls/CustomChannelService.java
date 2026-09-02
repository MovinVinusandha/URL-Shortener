package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.users.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomChannelService {

    private final CustomChannelRepository customChannelRepository;

    public List<CustomChannelDto> getUserCustomChannels(Long userId) {
        return customChannelRepository.findAllByUserIdOrderByIdAsc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public CustomChannelDto createCustomChannel(CustomChannelRequest request, User user) {
        if (customChannelRepository.existsByNameIgnoreCaseAndUserId(request.getName().trim(), user.getId())) {
            throw new IllegalArgumentException("A channel with this name already exists.");
        }

        CustomChannel channel = CustomChannel.builder()
                .name(request.getName().trim())
                .utmSource(request.getUtmSource().trim())
                .utmMedium(request.getUtmMedium().trim())
                .user(user)
                .build();

        CustomChannel saved = customChannelRepository.save(channel);
        return toDto(saved);
    }

    @Transactional
    public void deleteCustomChannel(Long id, User user) {
        CustomChannel channel = customChannelRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Custom channel not found"));
        customChannelRepository.delete(channel);
    }

    private CustomChannelDto toDto(CustomChannel channel) {
        return CustomChannelDto.builder()
                .id(channel.getId())
                .name(channel.getName())
                .utmSource(channel.getUtmSource())
                .utmMedium(channel.getUtmMedium())
                .createdAt(channel.getCreatedAt())
                .build();
    }
}
