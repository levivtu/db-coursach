insert into genres (title, description) values
('Fiction', 'Literary fiction and novels'),
('Science Fiction', 'Speculative fiction dealing with imaginative concepts'),
('Fantasy', 'Fiction featuring magical elements'),
('Mystery', 'Suspenseful stories involving crimes or puzzles'),
('Romance', 'Stories focusing on romantic relationships'),
('Biography', 'Accounts of someone''s life'),
('History', 'Studies of past events'),
('Science', 'Systematic study of the physical world'),
('Self-Help', 'Books offering advice for personal improvement'),
('Thriller', 'Exciting stories with suspenseful plots');

insert into authors (name, biography) values
('George Orwell', 'English novelist, essayist, journalist and critic, best known for his dystopian novel 1984.'),
('J.K. Rowling', 'British author, best known for writing the Harry Potter fantasy series.'),
('Agatha Christie', 'English writer known for her 66 detective novels and 14 short story collections.'),
('Stephen King', 'American author of horror, supernatural fiction, suspense, crime, science-fiction, and fantasy novels.'),
('Jane Austen', 'English novelist known primarily for her six major novels.'),
('Mark Twain', 'American writer, humorist, entrepreneur, publisher, and lecturer.'),
('Ernest Hemingway', 'American novelist, short-story writer, and journalist.'),
('Isaac Asimov', 'Russian-American writer and professor of biochemistry at Boston University.'),
('J.R.R. Tolkien', 'English writer, poet, philologist, and university professor.'),
('Dan Brown', 'American author best known for his thriller novels.');

insert into publishers (title, description) values
('Penguin Random House', 'One of the largest English-language book publishers in the world.'),
('HarperCollins', 'Publishing house owned by News Corporation.'),
('Simon & Schuster', 'Major publishing company founded in New York City.'),
('Macmillan Publishers', 'International publishing company traditionally known as one of the "Big Five" publishers.'),
('Hachette Livre', 'French publishing company, part of Lagardère Group.'),
('Scholastic Corporation', 'Multimedia publishing and education company.'),
('Bloomsbury Publishing', 'British independent publishing house.');

insert into users (name, email, password_hash, user_role) values
('John Buyer', 'buyer@mail.com', '25d55ad283aa400af464c76d713c07ad', 'buyer'),
('Emma Employee', 'employee@mail.com', '25d55ad283aa400af464c76d713c07ad', 'employee');

insert into buyers (user_id) values
(1);

insert into employees (user_id) values
(2);

insert into books (isbn, title, description, price, stock_amount, author_id, genre_id, publisher_id) values
('978-0-452-28423-4', '1984', 'A dystopian social science fiction novel by George Orwell.', 12.99, 50, 1, 1, 1),
('978-0-439-70818-8', 'Harry Potter and the Philosopher''s Stone', 'A young wizard begins his journey at Hogwarts School of Witchcraft and Wizardry.', 14.99, 100, 2, 3, 6),
('978-06-207356-0', 'And Then There Were None', 'A mystery novel by Agatha Christie.', 11.99, 75, 3, 4, 1),
('978-1-444-72484-9', 'The Shining', 'A horror novel by Stephen King.', 13.99, 60, 4, 9, 2),
('978-0-14-143951-8', 'Pride and Prejudice', 'A romantic novel by Jane Austen.', 10.99, 80, 5, 5, 1),
('978-0-486-40049-4', 'The Adventures of Tom Sawyer', 'A novel about a boy growing up along the Mississippi River.', 9.99, 45, 6, 1, 3),
('978-0-684-8035-8', 'The Old Man and the Sea', 'A short novel by Ernest Hemingway.', 8.99, 55, 7, 1, 4),
('978-0-553-29335-7', 'Foundation', 'A science fiction novel by Isaac Asimov.', 15.99, 40, 8, 2, 2),
('978-0-544-00341-5', 'The Hobbit', 'A children''s fantasy novel by J.R.R. Tolkien.', 12.49, 90, 9, 3, 1),
('978-0-7432-7356-5', 'The Da Vinci Code', 'A mystery thriller by Dan Brown.', 14.49, 70, 10, 4, 3),
('978-0-451-52493-5', 'Animal Farm', 'An allegorical novella by George Orwell.', 9.49, 65, 1, 1, 1),
('978-0-06-440499-9', 'Harry Potter and the Chamber of Secrets', 'The second book in the Harry Potter series.', 15.49, 85, 2, 3, 6),
('978-0-06-202008-9', 'Murder on the Orient Express', 'A detective novel by Agatha Christie.', 12.99, 50, 3, 4, 1),
('978-0-671-02453-8', 'It', 'A horror novel by Stephen King.', 16.99, 55, 4, 9, 2),
('978-0-14-243722-5', 'Sense and Sensibility', 'A novel by Jane Austen.', 11.49, 45, 5, 5, 1);

-- seed a considerable amount of orders/returns for john buyer (buyer_id = 1)

-- order 1 (2026-02-02)
with o as (
  insert into orders (buyer_id, total_price, created_at)
  values (1, 44.97, '2026-02-02 10:15:00+00')
  returning id
)
insert into orders_contents (order_id, book_id, amount, price_per_book)
select o.id, items.book_id, items.amount, b.price
from o
join (
  values
    (1, 2),   -- 1984 x2
    (2, 1),   -- hp1 x1
    (11, 1)   -- animal farm x1
) as items(book_id, amount) on true
join books b on b.id = items.book_id;

-- order 2 (2026-02-10)
with o as (
  insert into orders (buyer_id, total_price, created_at)
  values (1, 50.95, '2026-02-10 18:40:00+00')
  returning id
)
insert into orders_contents (order_id, book_id, amount, price_per_book)
select o.id, items.book_id, items.amount, b.price
from o
join (
  values
    (9, 1),   -- the hobbit x1
    (8, 2),   -- foundation x2
    (7, 1)    -- the old man and the sea x1
) as items(book_id, amount) on true
join books b on b.id = items.book_id;

-- order 3 (2026-02-18) + later return (partial)
with o as (
  insert into orders (buyer_id, total_price, created_at)
  values (1, 45.47, '2026-02-18 09:05:00+00')
  returning id
),
oc as (
  insert into orders_contents (order_id, book_id, amount, price_per_book)
  select o.id, items.book_id, items.amount, b.price
  from o
  join (
    values
      (10, 1),  -- da vinci code x1
      (3, 1),   -- and then there were none x1
      (13, 1),  -- murder on the orient express x1
      (6, 1)    -- tom sawyer x1
  ) as items(book_id, amount) on true
  join books b on b.id = items.book_id
  returning id, order_id, book_id
),
r as (
  insert into returns (order_id, reason, created_at)
  select o.id, 'did not like the condition of one item', '2026-02-21 14:20:00+00'
  from o
  returning id, order_id
)
insert into returns_contents (return_id, order_content_id)
select r.id, oc.id
from r
join oc on oc.order_id = r.order_id
where oc.book_id in (6); -- return tom sawyer

-- order 4 (2026-03-03) + return (multiple items)
with o as (
  insert into orders (buyer_id, total_price, created_at)
  values (1, 74.46, '2026-03-03 12:30:00+00')
  returning id
),
oc as (
  insert into orders_contents (order_id, book_id, amount, price_per_book)
  select o.id, items.book_id, items.amount, b.price
  from o
  join (
    values
      (2, 2),   -- hp1 x2
      (12, 1),  -- hp2 x1
      (9, 1),   -- the hobbit x1
      (4, 1)    -- the shining x1
  ) as items(book_id, amount) on true
  join books b on b.id = items.book_id
  returning id, order_id, book_id
),
r as (
  insert into returns (order_id, reason, created_at)
  select o.id, 'wrong gift choice (recipient already had some books)', '2026-03-07 16:00:00+00'
  from o
  returning id, order_id
)
insert into returns_contents (return_id, order_content_id)
select r.id, oc.id
from r
join oc on oc.order_id = r.order_id
where oc.book_id in (4, 12); -- return the shining + hp2

-- order 5 (2026-03-12)
with o as (
  insert into orders (buyer_id, total_price, created_at)
  values (1, 72.93, '2026-03-12 20:10:00+00')
  returning id
)
insert into orders_contents (order_id, book_id, amount, price_per_book)
select o.id, items.book_id, items.amount, b.price
from o
join (
  values
    (14, 2),  -- it x2
    (1, 1),   -- 1984 x1
    (5, 2)    -- pride and prejudice x2
) as items(book_id, amount) on true
join books b on b.id = items.book_id;