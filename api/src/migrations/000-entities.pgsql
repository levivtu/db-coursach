create table if not exists authors (
    id          serial primary key,
    name        varchar(255) not null,
    biography   text
);

create table if not exists genres (
    id          serial primary key,
    title       varchar(30) not null,
    description varchar(255)
);

create table if not exists publishers (
    id          serial primary key,
    title       varchar(30) not null,
    description varchar(255)
);

create table if not exists books (
    id              serial primary key,
    isbn            varchar(20) unique,
    title           varchar(255) not null,
    description     text,
    price           decimal(10, 2) not null,
    stock_amount    integer not null,
    author_id       integer references authors(id) not null,
    genre_id        integer references genres(id) not null,
    publisher_id    integer references publishers(id) not null
);

create type user_role as enum ('buyer', 'employee');

create table if not exists users (
    id              serial primary key,
    name            varchar(60) not null,
    email           varchar(255) unique not null,
    password_hash   varchar(256) not null,
    user_role       user_role not null
);

create table if not exists buyers (
    id      serial primary key,
    user_id integer references users(id) on delete cascade not null
);

create table if not exists employees (
    id      serial primary key,
    user_id integer references users(id) on delete cascade not null
);

create table if not exists discounts (
    book_id         integer references books(id) on delete cascade not null,
    discount_value  float not null
);

create table if not exists carts (
    id          serial primary key,
    buyer_id    integer references buyers(id) on delete cascade not null,
    total_price decimal(10, 2) default 0 not null
);

create table if not exists carts_contents (
    cart_id integer references carts(id) on delete cascade not null,
    book_id integer references books(id) on delete cascade not null,
    amount  integer not null,
    primary key (cart_id, book_id)
);

create table if not exists orders (
    id          serial primary key,
    buyer_id    integer references buyers(id) on delete cascade not null,
    total_price decimal(10, 2) not null,
    created_at  timestamp with time zone  not null
);

create table if not exists orders_contents (
    id              serial primary key,
    order_id        integer references orders(id) on delete cascade not null,
    book_id         integer references books(id) on delete cascade not null,
    amount          integer not null,
    price_per_book  decimal(10, 2) not null,
    unique (order_id, book_id)
);

create table if not exists returns (
    id              serial primary key,
    order_id        integer references orders(id) on delete cascade not null,
    reason          text not null,
    returned_price  decimal(10, 2) default 0 not null,
    created_at      timestamp with time zone not null
);

create table if not exists returns_contents (
    return_id        integer references returns(id) on delete cascade not null,
    order_content_id integer references orders_contents(id) on delete cascade not null,
    primary key (return_id, order_content_id)
);

create table if not exists query_logs (
    id              serial primary key,
    is_successful   boolean not null,
    query_text      text not null
)