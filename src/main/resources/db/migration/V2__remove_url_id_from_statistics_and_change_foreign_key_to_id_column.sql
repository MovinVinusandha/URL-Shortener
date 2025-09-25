alter table statistics
    drop foreign key statistics_urls_id_fk;

alter table statistics
    drop column url_id;

alter table statistics
    add constraint statistics_urls_id_fk
        foreign key (id) references urls (id)
            on delete cascade;
