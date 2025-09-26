package com.url_shortener.url_shortener.mappers;

import com.url_shortener.url_shortener.dtos.UrlDto;
import com.url_shortener.url_shortener.entities.Url;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UrlMapper {
    UrlDto toDto(Url url);
}
