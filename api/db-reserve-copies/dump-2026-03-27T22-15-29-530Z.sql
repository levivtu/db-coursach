--
-- PostgreSQL database dump
--

\restrict 8ZqWYBxIclcZeG4UZfFD5M00CEjAHbRfqxr9AsgequLuHAVrjEFOjh9xx2rLTfV

-- Dumped from database version 14.19
-- Dumped by pg_dump version 14.19

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'buyer',
    'employee'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: calculate_cart_total(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_cart_total() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
    target_cart_id integer;
begin
    if tg_op = 'delete' then
        target_cart_id := old.cart_id;
    else
        target_cart_id := new.cart_id;
    end if;

    update carts
    set total_price = (
        select coalesce(sum(cc.amount * b.price), 0)
        from carts_contents cc
        join books b on cc.book_id = b.id
        where cc.cart_id = target_cart_id
    )
    where id = target_cart_id;

    if tg_op = 'delete' then
        return old;
    else
        return new;
    end if;
end;
$$;


ALTER FUNCTION public.calculate_cart_total() OWNER TO postgres;

--
-- Name: calculate_returned_price(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_returned_price() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
    target_return_id integer;
    calculated_returned_price decimal(10,2);
begin
    if tg_op = 'delete' then
        target_return_id := old.return_id;
    else
        target_return_id := new.return_id;
    end if;

    select coalesce(sum(oc.price_per_book), 0)
    from returns_contents rc
    join orders_contents oc on rc.order_content_id = oc.id
    into calculated_returned_price
    where rc.return_id = target_return_id;

    update returns
    set returned_price = calculated_returned_price
    where id = target_return_id;

    if tg_op = 'delete' then
        return old;
    else
        return new;
    end if;
end;
$$;


ALTER FUNCTION public.calculate_returned_price() OWNER TO postgres;

--
-- Name: create_cart_for_buyer(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_cart_for_buyer() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
    new_cart_id integer;
begin
    insert into carts (buyer_id, total_price)
    values (new.id, 0)
    returning id into new_cart_id;

    return new;
end;
$$;


ALTER FUNCTION public.create_cart_for_buyer() OWNER TO postgres;

--
-- Name: get_average_order_value(date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_average_order_value(start_date date, end_date date) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
declare
    avg_value decimal(10,2);
begin
    select coalesce(avg(order_totals.total), 0)
    from (
        select o.id, sum(oc.amount * oc.price_per_book) as total
        from orders o
        join orders_contents oc on o.id = oc.order_id
        where o.created_at >= start_date::timestamp
          and o.created_at <= (end_date::timestamp + interval '23 hours 59 minutes 59 seconds')
        group by o.id
    ) as order_totals
    into avg_value;

    return avg_value;
end;
$$;


ALTER FUNCTION public.get_average_order_value(start_date date, end_date date) OWNER TO postgres;

--
-- Name: get_top_selling_books(date, date, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_top_selling_books(start_date date, end_date date, limit_count integer DEFAULT 10) RETURNS TABLE(book_id integer, title text, total_sold integer, total_revenue numeric)
    LANGUAGE plpgsql
    AS $$
begin
    return query
    select 
        b.id as book_id,
        b.title::text as title,
        sum(oc.amount)::integer as total_sold,
        sum(oc.amount * oc.price_per_book)::decimal(10,2) as total_revenue
    from books b
    join orders_contents oc on b.id = oc.book_id
    join orders o on oc.order_id = o.id
    where o.created_at >= start_date::timestamp
      and o.created_at <= (end_date::timestamp + interval '23 hours 59 minutes 59 seconds')
    group by b.id, b.title
    order by total_sold desc
    limit limit_count;
end;
$$;


ALTER FUNCTION public.get_top_selling_books(start_date date, end_date date, limit_count integer) OWNER TO postgres;

--
-- Name: get_total_sales_revenue(date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_total_sales_revenue(start_date date, end_date date) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
declare
    total_revenue decimal(10,2);
begin
    select coalesce(sum(oc.amount * oc.price_per_book), 0)
    from orders o
    join orders_contents oc on o.id = oc.order_id
    where o.created_at >= start_date::timestamp
      and o.created_at <= (end_date::timestamp + interval '23 hours 59 minutes 59 seconds')
    into total_revenue;

    return total_revenue;
end;
$$;


ALTER FUNCTION public.get_total_sales_revenue(start_date date, end_date date) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: authors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.authors (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    biography text
);


ALTER TABLE public.authors OWNER TO postgres;

--
-- Name: authors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.authors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.authors_id_seq OWNER TO postgres;

--
-- Name: authors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.authors_id_seq OWNED BY public.authors.id;


--
-- Name: books; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.books (
    id integer NOT NULL,
    isbn character varying(20),
    title character varying(255) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    stock_amount integer NOT NULL,
    author_id integer NOT NULL,
    genre_id integer NOT NULL,
    publisher_id integer NOT NULL
);


ALTER TABLE public.books OWNER TO postgres;

--
-- Name: books_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.books_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.books_id_seq OWNER TO postgres;

--
-- Name: books_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.books_id_seq OWNED BY public.books.id;


--
-- Name: buyers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.buyers (
    id integer NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE public.buyers OWNER TO postgres;

--
-- Name: buyers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.buyers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.buyers_id_seq OWNER TO postgres;

--
-- Name: buyers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.buyers_id_seq OWNED BY public.buyers.id;


--
-- Name: carts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carts (
    id integer NOT NULL,
    buyer_id integer NOT NULL,
    total_price numeric(10,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.carts OWNER TO postgres;

--
-- Name: carts_contents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carts_contents (
    cart_id integer NOT NULL,
    book_id integer NOT NULL,
    amount integer NOT NULL
);


ALTER TABLE public.carts_contents OWNER TO postgres;

--
-- Name: carts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.carts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.carts_id_seq OWNER TO postgres;

--
-- Name: carts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.carts_id_seq OWNED BY public.carts.id;


--
-- Name: discounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.discounts (
    book_id integer NOT NULL,
    discount_value double precision NOT NULL
);


ALTER TABLE public.discounts OWNER TO postgres;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.employees_id_seq OWNER TO postgres;

--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: genres; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.genres (
    id integer NOT NULL,
    title character varying(30) NOT NULL,
    description character varying(255)
);


ALTER TABLE public.genres OWNER TO postgres;

--
-- Name: genres_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.genres_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.genres_id_seq OWNER TO postgres;

--
-- Name: genres_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.genres_id_seq OWNED BY public.genres.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    buyer_id integer NOT NULL,
    total_price numeric(10,2) NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_contents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders_contents (
    id integer NOT NULL,
    order_id integer NOT NULL,
    book_id integer NOT NULL,
    amount integer NOT NULL,
    price_per_book numeric(10,2) NOT NULL
);


ALTER TABLE public.orders_contents OWNER TO postgres;

--
-- Name: orders_contents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_contents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.orders_contents_id_seq OWNER TO postgres;

--
-- Name: orders_contents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_contents_id_seq OWNED BY public.orders_contents.id;


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: publishers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.publishers (
    id integer NOT NULL,
    title character varying(30) NOT NULL,
    description character varying(255)
);


ALTER TABLE public.publishers OWNER TO postgres;

--
-- Name: publishers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.publishers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.publishers_id_seq OWNER TO postgres;

--
-- Name: publishers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.publishers_id_seq OWNED BY public.publishers.id;


--
-- Name: query_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.query_logs (
    id integer NOT NULL,
    is_successful boolean NOT NULL,
    query_text text NOT NULL
);


ALTER TABLE public.query_logs OWNER TO postgres;

--
-- Name: query_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.query_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.query_logs_id_seq OWNER TO postgres;

--
-- Name: query_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.query_logs_id_seq OWNED BY public.query_logs.id;


--
-- Name: returns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.returns (
    id integer NOT NULL,
    order_id integer NOT NULL,
    reason text NOT NULL,
    returned_price numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.returns OWNER TO postgres;

--
-- Name: returns_contents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.returns_contents (
    return_id integer NOT NULL,
    order_content_id integer NOT NULL
);


ALTER TABLE public.returns_contents OWNER TO postgres;

--
-- Name: returns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.returns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.returns_id_seq OWNER TO postgres;

--
-- Name: returns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.returns_id_seq OWNED BY public.returns.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(60) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(256) NOT NULL,
    user_role public.user_role NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: authors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.authors ALTER COLUMN id SET DEFAULT nextval('public.authors_id_seq'::regclass);


--
-- Name: books id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.books ALTER COLUMN id SET DEFAULT nextval('public.books_id_seq'::regclass);


--
-- Name: buyers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buyers ALTER COLUMN id SET DEFAULT nextval('public.buyers_id_seq'::regclass);


--
-- Name: carts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts ALTER COLUMN id SET DEFAULT nextval('public.carts_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: genres id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.genres ALTER COLUMN id SET DEFAULT nextval('public.genres_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: orders_contents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders_contents ALTER COLUMN id SET DEFAULT nextval('public.orders_contents_id_seq'::regclass);


--
-- Name: publishers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publishers ALTER COLUMN id SET DEFAULT nextval('public.publishers_id_seq'::regclass);


--
-- Name: query_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.query_logs ALTER COLUMN id SET DEFAULT nextval('public.query_logs_id_seq'::regclass);


--
-- Name: returns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.returns ALTER COLUMN id SET DEFAULT nextval('public.returns_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: authors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.authors (id, name, biography) FROM stdin;
1	George Orwell	English novelist, essayist, journalist and critic, best known for his dystopian novel 1984.
2	J.K. Rowling	British author, best known for writing the Harry Potter fantasy series.
3	Agatha Christie	English writer known for her 66 detective novels and 14 short story collections.
4	Stephen King	American author of horror, supernatural fiction, suspense, crime, science-fiction, and fantasy novels.
5	Jane Austen	English novelist known primarily for her six major novels.
6	Mark Twain	American writer, humorist, entrepreneur, publisher, and lecturer.
7	Ernest Hemingway	American novelist, short-story writer, and journalist.
8	Isaac Asimov	Russian-American writer and professor of biochemistry at Boston University.
9	J.R.R. Tolkien	English writer, poet, philologist, and university professor.
10	Dan Brown	American author best known for his thriller novels.
\.


--
-- Data for Name: books; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.books (id, isbn, title, description, price, stock_amount, author_id, genre_id, publisher_id) FROM stdin;
4	978-1-444-72484-9	The Shining	A horror novel by Stephen King.	13.99	60	4	9	2
5	978-0-14-143951-8	Pride and Prejudice	A romantic novel by Jane Austen.	10.99	80	5	5	1
6	978-0-486-40049-4	The Adventures of Tom Sawyer	A novel about a boy growing up along the Mississippi River.	9.99	45	6	1	3
7	978-0-684-8035-8	The Old Man and the Sea	A short novel by Ernest Hemingway.	8.99	55	7	1	4
8	978-0-553-29335-7	Foundation	A science fiction novel by Isaac Asimov.	15.99	40	8	2	2
9	978-0-544-00341-5	The Hobbit	A children's fantasy novel by J.R.R. Tolkien.	12.49	90	9	3	1
10	978-0-7432-7356-5	The Da Vinci Code	A mystery thriller by Dan Brown.	14.49	70	10	4	3
11	978-0-451-52493-5	Animal Farm	An allegorical novella by George Orwell.	9.49	65	1	1	1
12	978-0-06-440499-9	Harry Potter and the Chamber of Secrets	The second book in the Harry Potter series.	15.49	85	2	3	6
13	978-0-06-202008-9	Murder on the Orient Express	A detective novel by Agatha Christie.	12.99	50	3	4	1
14	978-0-671-02453-8	It	A horror novel by Stephen King.	16.99	55	4	9	2
15	978-0-14-243722-5	Sense and Sensibility	A novel by Jane Austen.	11.49	45	5	5	1
3	978-06-207356-0	And Then There Were None	A mystery novel by Agatha Christie.	11.99	70	3	4	1
2	978-0-439-70818-8	Harry Potter and the Philosopher's Stone	A young wizard begins his journey at Hogwarts School of Witchcraft and Wizardry.	14.99	99	2	3	6
1	978-0-452-28423-4	1984	A dystopian social science fiction novel by George Orwell.	12.99	45	1	1	1
\.


--
-- Data for Name: buyers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.buyers (id, user_id) FROM stdin;
1	1
\.


--
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carts (id, buyer_id, total_price) FROM stdin;
1	1	64.95
\.


--
-- Data for Name: carts_contents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carts_contents (cart_id, book_id, amount) FROM stdin;
\.


--
-- Data for Name: discounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.discounts (book_id, discount_value) FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employees (id, user_id) FROM stdin;
1	2
\.


--
-- Data for Name: genres; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.genres (id, title, description) FROM stdin;
1	Fiction	Literary fiction and novels
2	Science Fiction	Speculative fiction dealing with imaginative concepts
3	Fantasy	Fiction featuring magical elements
4	Mystery	Suspenseful stories involving crimes or puzzles
5	Romance	Stories focusing on romantic relationships
6	Biography	Accounts of someone's life
7	History	Studies of past events
8	Science	Systematic study of the physical world
9	Self-Help	Books offering advice for personal improvement
10	Thriller	Exciting stories with suspenseful plots
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, buyer_id, total_price, created_at) FROM stdin;
1	1	44.97	2026-02-02 13:15:00+03
2	1	50.95	2026-02-10 21:40:00+03
3	1	45.47	2026-02-18 12:05:00+03
4	1	74.46	2026-03-03 15:30:00+03
5	1	72.93	2026-03-12 23:10:00+03
6	1	74.94	2026-03-27 22:10:35.348934+03
7	1	64.95	2026-03-28 01:13:34.68208+03
\.


--
-- Data for Name: orders_contents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders_contents (id, order_id, book_id, amount, price_per_book) FROM stdin;
1	1	1	2	12.99
2	1	2	1	14.99
3	1	11	1	9.49
4	2	7	1	8.99
5	2	8	2	15.99
6	2	9	1	12.49
7	3	3	1	11.99
8	3	6	1	9.99
9	3	10	1	14.49
10	3	13	1	12.99
11	4	2	2	14.99
12	4	4	1	13.99
13	4	9	1	12.49
14	4	12	1	15.49
15	5	1	1	12.99
16	5	5	2	10.99
17	5	14	2	16.99
18	6	3	5	11.99
19	6	2	1	14.99
20	7	1	5	12.99
\.


--
-- Data for Name: publishers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.publishers (id, title, description) FROM stdin;
1	Penguin Random House	One of the largest English-language book publishers in the world.
2	HarperCollins	Publishing house owned by News Corporation.
3	Simon & Schuster	Major publishing company founded in New York City.
4	Macmillan Publishers	International publishing company traditionally known as one of the "Big Five" publishers.
5	Hachette Livre	French publishing company, part of Lagardère Group.
6	Scholastic Corporation	Multimedia publishing and education company.
7	Bloomsbury Publishing	British independent publishing house.
\.


--
-- Data for Name: query_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.query_logs (id, is_successful, query_text) FROM stdin;
4	t	SELECT * FROM genres ORDER BY id
1	t	SELECT * FROM authors ORDER BY id
3	t	SELECT * FROM publishers ORDER BY id
5	t	SELECT id, name, email, user_role FROM users WHERE email = $1 AND password_hash = $2
25	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
45	t	SELECT * FROM genres ORDER BY id
65	t	SELECT stock_amount FROM books WHERE id = $1
85	t	SELECT * FROM publishers ORDER BY id
105	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
125	t	UPDATE carts_contents SET amount = $1 WHERE cart_id = $2 AND book_id = $3
145	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
165	t	UPDATE books SET stock_amount = stock_amount - $1 WHERE id = $2
185	t	SELECT id FROM buyers WHERE user_id = $1
205	t	\n      SELECT \n        o.*,\n        oc.id as content_id,\n        oc.order_id,\n        oc.book_id,\n        oc.amount,\n        oc.price_per_book,\n        b.title,\n        b.price as book_price\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      LEFT JOIN orders_contents oc ON o.id = oc.order_id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY o.created_at DESC\n      
225	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
245	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     WHERE b.author_id = $1 AND b.genre_id = $2 ORDER BY b.id LIMIT $3 OFFSET $4
265	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
285	t	\n      SELECT oc.*, b.title, b.price\n      FROM orders_contents oc\n      JOIN books b ON oc.book_id = b.id\n      WHERE oc.order_id = $1\n    
305	t	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
325	t	SELECT * from users
6	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
26	t	SELECT * FROM publishers ORDER BY id
46	t	SELECT * FROM publishers ORDER BY id
66	t	SELECT amount FROM carts_contents WHERE cart_id = $1 AND book_id = $2
86	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
106	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
126	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
146	t	SELECT COUNT(*) FROM books b
166	t	SELECT price, stock_amount FROM books WHERE id = $1
186	t	\n      SELECT * FROM orders WHERE id = $1 AND buyer_id = $2\n    
206	t	\n      SELECT \n        o.*,\n        oc.id as content_id,\n        oc.order_id,\n        oc.book_id,\n        oc.amount,\n        oc.price_per_book,\n        b.title,\n        b.price as book_price\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      LEFT JOIN orders_contents oc ON o.id = oc.order_id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY o.created_at DESC\n      
226	t	SELECT COUNT(*) FROM books b
246	t	SELECT COUNT(*) FROM books b WHERE b.author_id = $1 AND b.genre_id = $2
266	t	SELECT id FROM buyers WHERE user_id = $1
286	t	SELECT id FROM buyers WHERE user_id = $1
306	t	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
326	t	SELECT * from users
7	t	SELECT * FROM publishers ORDER BY id
27	t	SELECT * FROM authors ORDER BY id
47	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
67	t	INSERT INTO carts_contents (cart_id, book_id, amount) VALUES ($1, $2, $3)
87	t	SELECT COUNT(*) FROM books b
107	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
127	t	SELECT id FROM buyers WHERE user_id = $1
147	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n      WHERE b.id = $1\n    
167	t	\n          INSERT INTO orders_contents (order_id, book_id, amount, price_per_book)\n          VALUES ($1, $2, $3, $4)\n        
187	t	\n      SELECT oc.*, b.title, b.price\n      FROM orders_contents oc\n      JOIN books b ON oc.book_id = b.id\n      WHERE oc.order_id = $1\n    
207	f	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.id as content_id,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
227	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
247	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     WHERE b.author_id = $1 AND b.genre_id = $2 AND b.publisher_id = $3 ORDER BY b.id LIMIT $4 OFFSET $5
267	t	SELECT * FROM carts WHERE buyer_id = $1
287	t	\n      SELECT * FROM orders WHERE id = $1 AND buyer_id = $2\n    
307	t	SELECT id, name, email, user_role FROM users WHERE email = $1 AND password_hash = $2
327	t	SELECT * from users
8	t	SELECT * FROM genres ORDER BY id
28	t	SELECT * FROM genres ORDER BY id
48	t	SELECT COUNT(*) FROM books b
68	t	\n      SELECT \n        o.*,\n        oc.id as content_id,\n        oc.order_id,\n        oc.book_id,\n        oc.amount,\n        oc.price_per_book,\n        b.title,\n        b.price as book_price\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      LEFT JOIN orders_contents oc ON o.id = oc.order_id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY o.created_at DESC\n      
88	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n      WHERE b.id = $1\n    
108	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
128	t	SELECT id FROM carts WHERE buyer_id = $1
148	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n      WHERE b.id = $1\n    
168	t	UPDATE books SET stock_amount = stock_amount - $1 WHERE id = $2
188	t	SELECT id FROM buyers WHERE user_id = $1
208	f	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.id as content_id,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
228	t	SELECT COUNT(*) FROM books b
248	t	SELECT COUNT(*) FROM books b WHERE b.author_id = $1 AND b.genre_id = $2 AND b.publisher_id = $3
268	t	SELECT * FROM carts_contents WHERE cart_id = $1
288	t	\n      SELECT oc.*, b.title, b.price\n      FROM orders_contents oc\n      JOIN books b ON oc.book_id = b.id\n      WHERE oc.order_id = $1\n    
308	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
328	t	SELECT * from users
9	t	SELECT * FROM authors ORDER BY id
29	t	SELECT COUNT(*) FROM books b
49	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
69	t	\n      SELECT \n        o.*,\n        oc.id as content_id,\n        oc.order_id,\n        oc.book_id,\n        oc.amount,\n        oc.price_per_book,\n        b.title,\n        b.price as book_price\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      LEFT JOIN orders_contents oc ON o.id = oc.order_id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY o.created_at DESC\n      
89	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n      WHERE b.id = $1\n    
109	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
129	t	SELECT stock_amount FROM books WHERE id = $1
149	t	SELECT id FROM buyers WHERE user_id = $1
169	t	DELETE FROM carts_contents WHERE cart_id = $1
189	t	SELECT * FROM orders WHERE id = $1 AND buyer_id = $2
209	t	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
229	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
249	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     WHERE b.author_id = $1 AND b.genre_id = $2 AND b.publisher_id = $3 ORDER BY b.id LIMIT $4 OFFSET $5
289	t	SELECT id FROM buyers WHERE user_id = $1
309	t	SELECT * FROM publishers ORDER BY id
329	t	SELECT * from users
10	t	SELECT * FROM publishers ORDER BY id
30	t	SELECT * FROM publishers ORDER BY id
50	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
70	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
90	t	SELECT id FROM buyers WHERE user_id = $1
110	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
130	t	UPDATE carts_contents SET amount = $1 WHERE cart_id = $2 AND book_id = $3
150	t	SELECT id FROM carts WHERE buyer_id = $1
170	t	COMMIT
190	t	SELECT id, amount FROM orders_contents WHERE order_id = $1 AND book_id = $2
210	t	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
230	t	SELECT COUNT(*) FROM books b
250	t	SELECT COUNT(*) FROM books b WHERE b.author_id = $1 AND b.genre_id = $2 AND b.publisher_id = $3
270	t	\n        INSERT INTO orders (buyer_id, total_price, created_at)\n        VALUES ($1, $2, NOW())\n        RETURNING *\n      
290	t	SELECT * FROM orders WHERE id = $1 AND buyer_id = $2
310	t	SELECT * FROM authors ORDER BY id
11	t	SELECT * FROM genres ORDER BY id
31	t	SELECT * FROM authors ORDER BY id
51	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
71	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
91	t	SELECT id FROM carts WHERE buyer_id = $1
111	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
131	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
151	t	SELECT stock_amount FROM books WHERE id = $1
171	t	\n        SELECT oc.*, b.title, b.price\n        FROM orders_contents oc\n        JOIN books b ON oc.book_id = b.id\n        WHERE oc.order_id = $1\n      
191	t	SELECT id, amount FROM orders_contents WHERE order_id = $1 AND book_id = $2
211	t	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
231	t	SELECT id, name, email, user_role FROM users WHERE email = $1 AND password_hash = $2
251	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     WHERE b.author_id = $1 AND b.genre_id = $2 AND b.publisher_id = $3 ORDER BY b.id LIMIT $4 OFFSET $5
271	t	SELECT price, stock_amount FROM books WHERE id = $1
291	t	SELECT id, amount FROM orders_contents WHERE order_id = $1 AND book_id = $2
311	t	SELECT * FROM genres ORDER BY id
12	t	SELECT COUNT(*) FROM books b
32	t	SELECT * FROM genres ORDER BY id
52	t	SELECT * FROM authors ORDER BY id
72	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
92	t	SELECT stock_amount FROM books WHERE id = $1
112	t	SELECT id FROM buyers WHERE user_id = $1
132	t	SELECT id FROM buyers WHERE user_id = $1
152	t	SELECT amount FROM carts_contents WHERE cart_id = $1 AND book_id = $2
172	t	SELECT id FROM buyers WHERE user_id = $1
212	t	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
232	t	SELECT id, name, email, user_role FROM users WHERE email = $1 AND password_hash = $2
252	t	SELECT COUNT(*) FROM books b WHERE b.author_id = $1 AND b.genre_id = $2 AND b.publisher_id = $3
272	t	\n          INSERT INTO orders_contents (order_id, book_id, amount, price_per_book)\n          VALUES ($1, $2, $3, $4)\n        
312	t	SELECT COUNT(*) FROM books b
13	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
33	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
53	t	SELECT * FROM publishers ORDER BY id
73	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
93	t	SELECT amount FROM carts_contents WHERE cart_id = $1 AND book_id = $2
113	t	SELECT id FROM carts WHERE buyer_id = $1
133	t	SELECT id FROM carts WHERE buyer_id = $1
153	t	INSERT INTO carts_contents (cart_id, book_id, amount) VALUES ($1, $2, $3)
173	t	\n      SELECT * FROM orders WHERE id = $1 AND buyer_id = $2\n    
193	t	\n        INSERT INTO returns (order_id, reason, returned_price, created_at)\n        VALUES ($1, $2, 0, NOW())  -- Price will be calculated by trigger\n        RETURNING *\n      
213	t	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
233	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
253	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n      WHERE b.id = $1\n    
273	t	UPDATE books SET stock_amount = stock_amount - $1 WHERE id = $2
293	t	\n        INSERT INTO returns (order_id, reason, returned_price, created_at)\n        VALUES ($1, $2, 0, NOW())  -- Price will be calculated by trigger\n        RETURNING *\n      
313	t	SELECT * FROM publishers ORDER BY id
14	t	SELECT * FROM publishers ORDER BY id
34	t	SELECT COUNT(*) FROM books b
54	t	SELECT * FROM genres ORDER BY id
74	t	\n      SELECT \n        o.*,\n        oc.id as content_id,\n        oc.order_id,\n        oc.book_id,\n        oc.amount,\n        oc.price_per_book,\n        b.title,\n        b.price as book_price\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      LEFT JOIN orders_contents oc ON o.id = oc.order_id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY o.created_at DESC\n      
94	t	UPDATE carts_contents SET amount = $1 WHERE cart_id = $2 AND book_id = $3
114	t	SELECT stock_amount FROM books WHERE id = $1
134	t	SELECT stock_amount FROM books WHERE id = $1
154	t	\n      SELECT \n        o.*,\n        oc.id as content_id,\n        oc.order_id,\n        oc.book_id,\n        oc.amount,\n        oc.price_per_book,\n        b.title,\n        b.price as book_price\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      LEFT JOIN orders_contents oc ON o.id = oc.order_id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY o.created_at DESC\n      
174	t	\n      SELECT oc.*, b.title, b.price\n      FROM orders_contents oc\n      JOIN books b ON oc.book_id = b.id\n      WHERE oc.order_id = $1\n    
194	t	SELECT id FROM orders_contents WHERE order_id = $1 AND book_id = $2
214	t	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
234	t	SELECT * FROM publishers ORDER BY id
254	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n      WHERE b.id = $1\n    
274	t	DELETE FROM carts_contents WHERE cart_id = $1
294	t	SELECT id FROM orders_contents WHERE order_id = $1 AND book_id = $2
314	t	SELECT * FROM genres ORDER BY id
15	t	SELECT * FROM genres ORDER BY id
35	f	\n      SELECT c.*, cc.id as content_id, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
55	t	SELECT COUNT(*) FROM books b
75	t	\n      SELECT \n        o.*,\n        oc.id as content_id,\n        oc.order_id,\n        oc.book_id,\n        oc.amount,\n        oc.price_per_book,\n        b.title,\n        b.price as book_price\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      LEFT JOIN orders_contents oc ON o.id = oc.order_id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY o.created_at DESC\n      
95	t	\n      SELECT \n        o.*,\n        oc.id as content_id,\n        oc.order_id,\n        oc.book_id,\n        oc.amount,\n        oc.price_per_book,\n        b.title,\n        b.price as book_price\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      LEFT JOIN orders_contents oc ON o.id = oc.order_id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY o.created_at DESC\n      
115	t	UPDATE carts_contents SET amount = $1 WHERE cart_id = $2 AND book_id = $3
135	t	UPDATE carts_contents SET amount = $1 WHERE cart_id = $2 AND book_id = $3
155	t	\n      SELECT \n        o.*,\n        oc.id as content_id,\n        oc.order_id,\n        oc.book_id,\n        oc.amount,\n        oc.price_per_book,\n        b.title,\n        b.price as book_price\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      LEFT JOIN orders_contents oc ON o.id = oc.order_id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY o.created_at DESC\n      
175	t	SELECT id FROM buyers WHERE user_id = $1
195	t	\n          INSERT INTO returns_contents (return_id, order_content_id)\n          VALUES ($1, $2)\n        
215	t	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
235	t	SELECT * FROM authors ORDER BY id
255	t	SELECT id FROM buyers WHERE user_id = $1
275	t	COMMIT
295	t	\n          INSERT INTO returns_contents (return_id, order_content_id)\n          VALUES ($1, $2)\n        
315	t	SELECT * FROM authors ORDER BY id
16	t	SELECT * FROM authors ORDER BY id
36	f	\n      SELECT c.*, cc.id as content_id, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
56	t	SELECT * FROM genres ORDER BY id
76	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
96	t	\n      SELECT \n        o.*,\n        oc.id as content_id,\n        oc.order_id,\n        oc.book_id,\n        oc.amount,\n        oc.price_per_book,\n        b.title,\n        b.price as book_price\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      LEFT JOIN orders_contents oc ON o.id = oc.order_id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY o.created_at DESC\n      
116	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
136	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
156	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
176	t	\n      SELECT * FROM orders WHERE id = $1 AND buyer_id = $2\n    
196	t	SELECT id FROM orders_contents WHERE order_id = $1 AND book_id = $2
216	t	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
236	t	SELECT * FROM genres ORDER BY id
256	t	SELECT id FROM carts WHERE buyer_id = $1
276	t	\n        SELECT oc.*, b.title, b.price\n        FROM orders_contents oc\n        JOIN books b ON oc.book_id = b.id\n        WHERE oc.order_id = $1\n      
296	t	COMMIT
316	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
17	t	SELECT COUNT(*) FROM books b
37	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
57	t	SELECT * FROM authors ORDER BY id
77	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
97	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
117	t	SELECT id FROM buyers WHERE user_id = $1
137	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
157	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
177	t	\n      SELECT oc.*, b.title, b.price\n      FROM orders_contents oc\n      JOIN books b ON oc.book_id = b.id\n      WHERE oc.order_id = $1\n    
197	t	\n          INSERT INTO returns_contents (return_id, order_content_id)\n          VALUES ($1, $2)\n        
217	t	SELECT * FROM publishers ORDER BY id
237	t	SELECT COUNT(*) FROM books b
257	t	SELECT stock_amount FROM books WHERE id = $1
277	t	SELECT id FROM buyers WHERE user_id = $1
297	t	SELECT id FROM buyers WHERE user_id = $1
317	t	SELECT COUNT(*) FROM books b
18	t	SELECT * FROM publishers ORDER BY id
38	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
58	t	SELECT * FROM publishers ORDER BY id
78	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
98	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
118	t	SELECT id FROM carts WHERE buyer_id = $1
138	t	SELECT * FROM publishers ORDER BY id
158	t	SELECT id FROM buyers WHERE user_id = $1
178	f	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.id as content_id,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
198	t	COMMIT
218	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
238	t	SELECT * FROM publishers ORDER BY id
258	t	SELECT amount FROM carts_contents WHERE cart_id = $1 AND book_id = $2
278	t	\n      SELECT * FROM orders WHERE id = $1 AND buyer_id = $2\n    
298	t	\n      SELECT r.*, o.created_at as order_date\n      FROM returns r\n      JOIN orders o ON r.order_id = o.id\n      WHERE r.id = $1\n    
318	t	select \n  b.id as book_id,\n  b.title::text as title,\n  sum(oc.amount)::integer as total_sold,\n  sum(oc.amount * oc.price_per_book)::decimal(10,2) as total_revenue\nfrom books b\njoin orders_contents oc on b.id = oc.book_id\njoin orders o on oc.order_id = o.id\nwhere o.created_at >= $1::date::timestamp\n  and o.created_at <= ($2::date::timestamp + interval '23 hours 59 minutes 59 seconds')\ngroup by b.id, b.title\norder by total_sold desc\nlimit $3;\n\n
19	t	SELECT * FROM genres ORDER BY id
39	t	SELECT * FROM authors ORDER BY id
59	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
79	t	SELECT * FROM authors ORDER BY id
99	t	\n      SELECT \n        o.*,\n        oc.id as content_id,\n        oc.order_id,\n        oc.book_id,\n        oc.amount,\n        oc.price_per_book,\n        b.title,\n        b.price as book_price\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      LEFT JOIN orders_contents oc ON o.id = oc.order_id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY o.created_at DESC\n      
119	t	SELECT stock_amount FROM books WHERE id = $1
139	t	SELECT * FROM authors ORDER BY id
159	t	SELECT * FROM carts WHERE buyer_id = $1
179	f	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.id as content_id,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
199	t	SELECT id FROM buyers WHERE user_id = $1
219	t	SELECT * FROM authors ORDER BY id
239	t	SELECT * FROM authors ORDER BY id
259	t	INSERT INTO carts_contents (cart_id, book_id, amount) VALUES ($1, $2, $3)
279	t	\n      SELECT oc.*, b.title, b.price\n      FROM orders_contents oc\n      JOIN books b ON oc.book_id = b.id\n      WHERE oc.order_id = $1\n    
299	t	SELECT id FROM orders WHERE id = $1 AND buyer_id = $2
319	t	with revenue as (\n  select get_total_sales_revenue($1, $2) as total_revenue\n),\nbuyers_stats as (\n  select \n    b.id as buyer_id,\n    u.name as buyer_name,\n    coalesce(sum(o.total_price), 0) as total_spent\n  from orders o\n  join buyers b on o.buyer_id = b.id\n  join users u on b.user_id = u.id\n  where o.created_at between $1 and $2\n  group by b.id, u.name\n  order by total_spent desc\n  limit 10\n)\nselect \n  revenue.total_revenue,\n  buyers_stats.buyer_id,\n  buyers_stats.buyer_name,\n  buyers_stats.total_spent\nfrom revenue\nleft join buyers_stats on true\norder by buyers_stats.total_spent desc nulls last;\n\n
20	t	SELECT * FROM authors ORDER BY id
40	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
60	t	SELECT COUNT(*) FROM books b
80	t	SELECT * FROM publishers ORDER BY id
100	t	\n      SELECT \n        o.*,\n        oc.id as content_id,\n        oc.order_id,\n        oc.book_id,\n        oc.amount,\n        oc.price_per_book,\n        b.title,\n        b.price as book_price\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      LEFT JOIN orders_contents oc ON o.id = oc.order_id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY o.created_at DESC\n      
120	t	UPDATE carts_contents SET amount = $1 WHERE cart_id = $2 AND book_id = $3
140	t	SELECT * FROM genres ORDER BY id
160	t	SELECT * FROM carts_contents WHERE cart_id = $1
180	t	\n      SELECT \n        o.*,\n        oc.id as content_id,\n        oc.order_id,\n        oc.book_id,\n        oc.amount,\n        oc.price_per_book,\n        b.title,\n        b.price as book_price\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      LEFT JOIN orders_contents oc ON o.id = oc.order_id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY o.created_at DESC\n      
200	t	\n      SELECT r.*, o.created_at as order_date\n      FROM returns r\n      JOIN orders o ON r.order_id = o.id\n      WHERE r.id = $1\n    
220	t	SELECT * FROM genres ORDER BY id
240	t	SELECT * FROM genres ORDER BY id
260	t	\n      SELECT \n        o.*,\n        oc.id as content_id,\n        oc.order_id,\n        oc.book_id,\n        oc.amount,\n        oc.price_per_book,\n        b.title,\n        b.price as book_price\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      LEFT JOIN orders_contents oc ON o.id = oc.order_id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY o.created_at DESC\n      
280	t	SELECT id FROM buyers WHERE user_id = $1
300	t	\n      SELECT rc.*, oc.book_id, oc.amount as original_amount, oc.price_per_book, b.title\n      FROM returns_contents rc\n      JOIN orders_contents oc ON rc.order_content_id = oc.id\n      JOIN books b ON oc.book_id = b.id\n      WHERE rc.return_id = $1\n    
320	t	with avg_value as (\n  select get_average_order_value($1, $2) as avg_value\n),\nbooks as (\n  select \n    b.id as book_id,\n    b.title::text as title,\n    sum(oc.amount)::integer as total_sold,\n    sum(oc.amount * oc.price_per_book)::decimal(10,2) as total_revenue\n  from books b\n  join orders_contents oc on b.id = oc.book_id\n  join orders o on oc.order_id = o.id\n  where o.created_at >= $1::date::timestamp\n    and o.created_at <= ($2::date::timestamp + interval '23 hours 59 minutes 59 seconds')\n  group by b.id, b.title\n  order by total_sold desc\n  limit 10\n)\nselect \n  avg_value.avg_value,\n  books.book_id,\n  books.title,\n  books.total_sold,\n  books.total_revenue\nfrom avg_value\nleft join books on true\norder by books.total_sold desc nulls last;\n\n
21	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
41	t	SELECT * FROM publishers ORDER BY id
61	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n      WHERE b.id = $1\n    
81	t	SELECT * FROM genres ORDER BY id
101	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
121	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
141	t	SELECT COUNT(*) FROM books b
181	t	\n      SELECT \n        o.*,\n        oc.id as content_id,\n        oc.order_id,\n        oc.book_id,\n        oc.amount,\n        oc.price_per_book,\n        b.title,\n        b.price as book_price\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      LEFT JOIN orders_contents oc ON o.id = oc.order_id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY o.created_at DESC\n      
201	t	SELECT id FROM orders WHERE id = $1 AND buyer_id = $2
221	t	SELECT COUNT(*) FROM books b
241	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
261	t	\n      SELECT \n        o.*,\n        oc.id as content_id,\n        oc.order_id,\n        oc.book_id,\n        oc.amount,\n        oc.price_per_book,\n        b.title,\n        b.price as book_price\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      LEFT JOIN orders_contents oc ON o.id = oc.order_id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY o.created_at DESC\n      
281	t	\n      SELECT * FROM orders WHERE id = $1 AND buyer_id = $2\n    
301	t	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
321	t	with revenue as (\n  select get_total_sales_revenue($1, $2) as total_revenue\n),\nbuyers_stats as (\n  select \n    b.id as buyer_id,\n    u.name as buyer_name,\n    coalesce(sum(o.total_price), 0) as total_spent\n  from orders o\n  join buyers b on o.buyer_id = b.id\n  join users u on b.user_id = u.id\n  where o.created_at between $1 and $2\n  group by b.id, u.name\n  order by total_spent desc\n  limit 10\n)\nselect \n  revenue.total_revenue,\n  buyers_stats.buyer_id,\n  buyers_stats.buyer_name,\n  buyers_stats.total_spent\nfrom revenue\nleft join buyers_stats on true\norder by buyers_stats.total_spent desc nulls last;\n\n
22	t	SELECT COUNT(*) FROM books b
42	t	SELECT * FROM genres ORDER BY id
62	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n      WHERE b.id = $1\n    
82	t	SELECT COUNT(*) FROM books b
102	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
122	t	SELECT id FROM buyers WHERE user_id = $1
142	t	SELECT * FROM publishers ORDER BY id
162	t	\n        INSERT INTO orders (buyer_id, total_price, created_at)\n        VALUES ($1, $2, NOW())\n        RETURNING *\n      
182	t	SELECT id FROM buyers WHERE user_id = $1
202	t	\n      SELECT rc.*, oc.book_id, oc.amount as original_amount, oc.price_per_book, b.title\n      FROM returns_contents rc\n      JOIN orders_contents oc ON rc.order_content_id = oc.id\n      JOIN books b ON oc.book_id = b.id\n      WHERE rc.return_id = $1\n    
222	t	SELECT * FROM publishers ORDER BY id
242	t	SELECT COUNT(*) FROM books b
262	t	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
282	t	\n      SELECT oc.*, b.title, b.price\n      FROM orders_contents oc\n      JOIN books b ON oc.book_id = b.id\n      WHERE oc.order_id = $1\n    
302	t	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
322	t	select \n  b.id as book_id,\n  b.title::text as title,\n  sum(oc.amount)::integer as total_sold,\n  sum(oc.amount * oc.price_per_book)::decimal(10,2) as total_revenue\nfrom books b\njoin orders_contents oc on b.id = oc.book_id\njoin orders o on oc.order_id = o.id\nwhere o.created_at >= $1::date::timestamp\n  and o.created_at <= ($2::date::timestamp + interval '23 hours 59 minutes 59 seconds')\ngroup by b.id, b.title\norder by total_sold desc\nlimit $3;\n\n
23	f	\n      SELECT c.*, cc.id as content_id, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
43	t	SELECT COUNT(*) FROM books b
63	t	SELECT id FROM buyers WHERE user_id = $1
83	t	SELECT * FROM genres ORDER BY id
103	t	\n      SELECT \n        o.*,\n        oc.id as content_id,\n        oc.order_id,\n        oc.book_id,\n        oc.amount,\n        oc.price_per_book,\n        b.title,\n        b.price as book_price\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      LEFT JOIN orders_contents oc ON o.id = oc.order_id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY o.created_at DESC\n      
123	t	SELECT id FROM carts WHERE buyer_id = $1
143	t	SELECT * FROM genres ORDER BY id
163	t	SELECT price, stock_amount FROM books WHERE id = $1
183	t	\n      SELECT * FROM orders WHERE id = $1 AND buyer_id = $2\n    
203	f	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.id as content_id,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
223	t	SELECT * FROM genres ORDER BY id
243	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     WHERE b.author_id = $1 ORDER BY b.id LIMIT $2 OFFSET $3
263	t	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
283	t	SELECT id FROM buyers WHERE user_id = $1
303	t	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
323	t	with avg_value as (\n  select get_average_order_value($1, $2) as avg_value\n),\nbooks as (\n  select \n    b.id as book_id,\n    b.title::text as title,\n    sum(oc.amount)::integer as total_sold,\n    sum(oc.amount * oc.price_per_book)::decimal(10,2) as total_revenue\n  from books b\n  join orders_contents oc on b.id = oc.book_id\n  join orders o on oc.order_id = o.id\n  where o.created_at >= $1::date::timestamp\n    and o.created_at <= ($2::date::timestamp + interval '23 hours 59 minutes 59 seconds')\n  group by b.id, b.title\n  order by total_sold desc\n  limit 10\n)\nselect \n  avg_value.avg_value,\n  books.book_id,\n  books.title,\n  books.total_sold,\n  books.total_revenue\nfrom avg_value\nleft join books on true\norder by books.total_sold desc nulls last;\n\n
24	f	\n      SELECT c.*, cc.id as content_id, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
44	t	SELECT * FROM authors ORDER BY id
64	t	SELECT id FROM carts WHERE buyer_id = $1
84	t	SELECT * FROM authors ORDER BY id
104	t	\n      SELECT \n        o.*,\n        oc.id as content_id,\n        oc.order_id,\n        oc.book_id,\n        oc.amount,\n        oc.price_per_book,\n        b.title,\n        b.price as book_price\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      LEFT JOIN orders_contents oc ON o.id = oc.order_id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY o.created_at DESC\n      
124	t	SELECT stock_amount FROM books WHERE id = $1
144	t	SELECT * FROM authors ORDER BY id
164	t	\n          INSERT INTO orders_contents (order_id, book_id, amount, price_per_book)\n          VALUES ($1, $2, $3, $4)\n        
184	t	\n      SELECT oc.*, b.title, b.price\n      FROM orders_contents oc\n      JOIN books b ON oc.book_id = b.id\n      WHERE oc.order_id = $1\n    
204	f	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.id as content_id,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
224	t	SELECT * FROM authors ORDER BY id
244	t	SELECT COUNT(*) FROM books b WHERE b.author_id = $1
264	t	\n      SELECT c.*, cc.cart_id, cc.book_id, cc.amount, b.title, b.price\n      FROM buyers b_user\n      JOIN carts c ON b_user.id = c.buyer_id\n      LEFT JOIN carts_contents cc ON c.id = cc.cart_id\n      LEFT JOIN books b ON cc.book_id = b.id\n      WHERE b_user.user_id = $1\n      
284	t	\n      SELECT * FROM orders WHERE id = $1 AND buyer_id = $2\n    
304	t	\n      SELECT \n        r.*,\n        o.created_at as order_date,\n        rc.return_id,\n        rc.order_content_id,\n        oc.book_id,\n        oc.amount as original_amount,\n        oc.price_per_book,\n        b.title\n      FROM buyers b_user\n      JOIN orders o ON b_user.id = o.buyer_id\n      JOIN returns r ON o.id = r.order_id\n      LEFT JOIN returns_contents rc ON r.id = rc.return_id\n      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id\n      LEFT JOIN books b ON oc.book_id = b.id\n      WHERE b_user.user_id = $1\n      ORDER BY r.created_at DESC\n      
324	t	SELECT * from users
2	t	\n      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title\n      FROM books b\n      JOIN authors a ON b.author_id = a.id\n      JOIN genres g ON b.genre_id = g.id\n      JOIN publishers p ON b.publisher_id = p.id\n     ORDER BY b.id LIMIT $1 OFFSET $2
\.


--
-- Data for Name: returns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.returns (id, order_id, reason, returned_price, created_at) FROM stdin;
1	3	did not like the condition of one item	9.99	2026-02-21 17:20:00+03
2	4	wrong gift choice (recipient already had some books)	29.48	2026-03-07 19:00:00+03
3	6	111	26.98	2026-03-27 22:10:51.838724+03
4	7	1111	12.99	2026-03-28 01:14:25.683143+03
\.


--
-- Data for Name: returns_contents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.returns_contents (return_id, order_content_id) FROM stdin;
1	8
2	12
2	14
3	19
3	18
4	20
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password_hash, user_role) FROM stdin;
1	John Buyer	buyer@mail.com	25d55ad283aa400af464c76d713c07ad	buyer
2	Emma Employee	employee@mail.com	25d55ad283aa400af464c76d713c07ad	employee
\.


--
-- Name: authors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.authors_id_seq', 10, true);


--
-- Name: books_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.books_id_seq', 15, true);


--
-- Name: buyers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.buyers_id_seq', 1, true);


--
-- Name: carts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.carts_id_seq', 1, true);


--
-- Name: employees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employees_id_seq', 1, true);


--
-- Name: genres_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.genres_id_seq', 10, true);


--
-- Name: orders_contents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_contents_id_seq', 20, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 7, true);


--
-- Name: publishers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.publishers_id_seq', 7, true);


--
-- Name: query_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.query_logs_id_seq', 329, true);


--
-- Name: returns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.returns_id_seq', 4, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- Name: authors authors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.authors
    ADD CONSTRAINT authors_pkey PRIMARY KEY (id);


--
-- Name: books books_isbn_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_isbn_key UNIQUE (isbn);


--
-- Name: books books_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_pkey PRIMARY KEY (id);


--
-- Name: buyers buyers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buyers
    ADD CONSTRAINT buyers_pkey PRIMARY KEY (id);


--
-- Name: carts_contents carts_contents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts_contents
    ADD CONSTRAINT carts_contents_pkey PRIMARY KEY (cart_id, book_id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: genres genres_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.genres
    ADD CONSTRAINT genres_pkey PRIMARY KEY (id);


--
-- Name: orders_contents orders_contents_order_id_book_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders_contents
    ADD CONSTRAINT orders_contents_order_id_book_id_key UNIQUE (order_id, book_id);


--
-- Name: orders_contents orders_contents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders_contents
    ADD CONSTRAINT orders_contents_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: publishers publishers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publishers
    ADD CONSTRAINT publishers_pkey PRIMARY KEY (id);


--
-- Name: query_logs query_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.query_logs
    ADD CONSTRAINT query_logs_pkey PRIMARY KEY (id);


--
-- Name: returns_contents returns_contents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.returns_contents
    ADD CONSTRAINT returns_contents_pkey PRIMARY KEY (return_id, order_content_id);


--
-- Name: returns returns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: carts_contents cart_contents_change_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER cart_contents_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.carts_contents FOR EACH ROW EXECUTE FUNCTION public.calculate_cart_total();


--
-- Name: buyers create_cart_after_buyer_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER create_cart_after_buyer_insert AFTER INSERT ON public.buyers FOR EACH ROW EXECUTE FUNCTION public.create_cart_for_buyer();


--
-- Name: returns_contents returns_contents_change_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER returns_contents_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.returns_contents FOR EACH ROW EXECUTE FUNCTION public.calculate_returned_price();


--
-- Name: books books_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.authors(id);


--
-- Name: books books_genre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES public.genres(id);


--
-- Name: books books_publisher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_publisher_id_fkey FOREIGN KEY (publisher_id) REFERENCES public.publishers(id);


--
-- Name: buyers buyers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buyers
    ADD CONSTRAINT buyers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: carts carts_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id) ON DELETE CASCADE;


--
-- Name: carts_contents carts_contents_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts_contents
    ADD CONSTRAINT carts_contents_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: carts_contents carts_contents_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts_contents
    ADD CONSTRAINT carts_contents_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- Name: discounts discounts_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT discounts_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: employees employees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: orders orders_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id) ON DELETE CASCADE;


--
-- Name: orders_contents orders_contents_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders_contents
    ADD CONSTRAINT orders_contents_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: orders_contents orders_contents_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders_contents
    ADD CONSTRAINT orders_contents_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: returns_contents returns_contents_order_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.returns_contents
    ADD CONSTRAINT returns_contents_order_content_id_fkey FOREIGN KEY (order_content_id) REFERENCES public.orders_contents(id) ON DELETE CASCADE;


--
-- Name: returns_contents returns_contents_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.returns_contents
    ADD CONSTRAINT returns_contents_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.returns(id) ON DELETE CASCADE;


--
-- Name: returns returns_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 8ZqWYBxIclcZeG4UZfFD5M00CEjAHbRfqxr9AsgequLuHAVrjEFOjh9xx2rLTfV

