create trigger cart_contents_change_trigger
    after insert or update or delete
    on carts_contents
    for each row
    execute function calculate_cart_total();

create trigger create_cart_after_buyer_insert
    after insert
    on buyers
    for each row
    execute function create_cart_for_buyer();

create trigger returns_contents_change_trigger
    after insert or update or delete
    on returns_contents
    for each row
    execute function calculate_returned_price();
