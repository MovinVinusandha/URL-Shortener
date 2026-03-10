package com.url_shortener.url_shortener.urls;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface UrlMapper {
    @Mapping(target = "accessed_times", source = "statistic.accessedTimes")
    @Mapping(target = "shortUrl", expression = "java(\"http://localhost:8080/\" + url.getShortUrl())")
    UrlDto toDto(Url url);

    @Mapping(target = "shortUrl", expression = "java(\"http://localhost:8080/\" + url.getShortUrl())")
    UrlSend toSendDto(Url url);

    @Mapping(target = "shortUrl", expression = "java(\"http://localhost:8080/\" + url.getShortUrl())")
    UrlUpdateDto toUpdateDto(Url url);

    Url toEntity(UrlRequest urlRequest);

    void updateUrl(UrlRequest urlRequest, @MappingTarget Url url);
}
