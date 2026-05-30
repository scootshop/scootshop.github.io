SET @now := NOW();
DELETE FROM orders WHERE id LIKE 'QA-ALIAS-%';
INSERT INTO orders (id, token, sku, name, amount, currency, status, payment_method, payer_email, created_at, updated_at)
VALUES
('QA-ALIAS-PENDING_PAYMENT', SHA2('qa1',256), 'M41TANK', 'Alias pending_payment', '530.00', 'EUR', 'pending_payment', 'bank', 'qa@example.com', @now, @now),
('QA-ALIAS-PENDING', SHA2('qa2',256), 'M41TANK', 'Alias pending', '530.00', 'EUR', 'pending', 'bank', 'qa@example.com', @now, @now),
('QA-ALIAS-PAID', SHA2('qa3',256), 'M41TANK', 'Alias paid', '530.00', 'EUR', 'paid', 'bank', 'qa@example.com', @now, @now),
('QA-ALIAS-APPROVED', SHA2('qa4',256), 'M41TANK', 'Alias approved', '530.00', 'EUR', 'approved', 'bank', 'qa@example.com', @now, @now),
('QA-ALIAS-COMPLETED', SHA2('qa5',256), 'M41TANK', 'Alias completed', '530.00', 'EUR', 'completed', 'bank', 'qa@example.com', @now, @now),
('QA-ALIAS-PROCESSING', SHA2('qa6',256), 'M41TANK', 'Alias processing', '530.00', 'EUR', 'processing', 'bank', 'qa@example.com', @now, @now),
('QA-ALIAS-PREPARING', SHA2('qa7',256), 'M41TANK', 'Alias preparing', '530.00', 'EUR', 'preparing', 'bank', 'qa@example.com', @now, @now),
('QA-ALIAS-SHIPPED', SHA2('qa8',256), 'M41TANK', 'Alias shipped', '530.00', 'EUR', 'shipped', 'bank', 'qa@example.com', @now, @now),
('QA-ALIAS-DELIVERED', SHA2('qa9',256), 'M41TANK', 'Alias delivered', '530.00', 'EUR', 'delivered', 'bank', 'qa@example.com', @now, @now),
('QA-ALIAS-CANCELLED', SHA2('qa10',256), 'M41TANK', 'Alias cancelled', '530.00', 'EUR', 'cancelled', 'bank', 'qa@example.com', @now, @now),
('QA-ALIAS-CANCELED', SHA2('qa11',256), 'M41TANK', 'Alias canceled', '530.00', 'EUR', 'canceled', 'bank', 'qa@example.com', @now, @now);
SELECT id,status FROM orders WHERE id LIKE 'QA-ALIAS-%' ORDER BY id;
