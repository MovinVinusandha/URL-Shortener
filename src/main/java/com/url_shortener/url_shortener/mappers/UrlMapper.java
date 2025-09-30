package com.url_shortener.url_shortener.mappers;

import com.url_shortener.url_shortener.dtos.UrlDto;
import com.url_shortener.url_shortener.dtos.UrlSend;
import com.url_shortener.url_shortener.dtos.UrlRequest;
import com.url_shortener.url_shortener.dtos.UrlUpdateDto;
import com.url_shortener.url_shortener.entities.Url;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface UrlMapper {
    @Mapping(target = "accessed_times", source = "statistic.accessedTimes")
    UrlDto toDto(Url url);

    UrlSend toSendDto(Url url);
    UrlUpdateDto toUpdateDto(Url url);
    Url toEntity(UrlRequest urlRequest);
    void updateUrl(UrlRequest urlRequest, @MappingTarget Url url);
}
