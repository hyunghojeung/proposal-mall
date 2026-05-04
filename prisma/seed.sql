-- 제안서몰 초기 시드 데이터
-- Supabase SQL Editor에 통째로 붙여넣고 Run 하면 됩니다.
-- 멱등성: 기존 시드 데이터는 모두 삭제 후 재삽입.

BEGIN;

-- ── 0. 기존 시드 데이터 정리 ─────────────
DELETE FROM "option_values";
DELETE FROM "option_groups";
DELETE FROM "products";
DELETE FROM "price_paper";
DELETE FROM "price_binding";
DELETE FROM "price_box";
DELETE FROM "faqs";
DELETE FROM "notices";

-- ── 1. 상품 ────────────────────────────
INSERT INTO "products" ("slug","name","category","binding","paper","description","sortOrder","updatedAt") VALUES
  ('carrier-box',       '제안서캐리어박스',    'CARRIER_BOX',       'NONE',    'NONE', '튼튼한 손잡이와 깔끔한 외형의 B2B 캐리어 박스. A4/A3 사이즈 지원.',           1, NOW()),
  ('magnetic-box',      '자석박스',           'MAGNETIC_BOX',      'NONE',    'NONE', '고급스러운 마감의 자석 잠금 케이스. 중요한 제안서를 임팩트 있게.',           2, NOW()),
  ('binding-3-ring',    '3공바인더',          'BINDING_3_RING',    'PRINTED', 'NONE', '100쪽 이상의 두꺼운 제안서에 적합. 인쇄형/원단형 선택.',                    3, NOW()),
  ('binding-pt',        'PT용바인더',         'BINDING_PT',        'PRINTED', 'NONE', '프레젠테이션용 슬림 바인더. 깔끔한 첫인상을 위한 선택.',                    4, NOW()),
  ('binding-hardcover', '하드커버스프링제본', 'BINDING_HARDCOVER', 'PRINTED', 'NONE', '고급 하드커버 + 스프링 제본. 격식 있는 제안에 어울립니다.',                 5, NOW()),
  ('paper-inner',       '내지 인쇄',          'PAPER_INNER',       'NONE',    'MOJO', '5종 용지 선택 가능: 모조지 / 스노우지 / 아트지 / 수입지 / 질감용지.',      6, NOW());

-- ── 2. 옵션 그룹 + 값 ───────────────────
-- 캐리어 박스
WITH p AS (SELECT id FROM "products" WHERE slug='carrier-box')
INSERT INTO "option_groups" ("productId","name","required","sortOrder")
SELECT p.id, v.name, true, v.so FROM p, (VALUES ('사이즈',0),('컬러',1)) AS v(name,so);
INSERT INTO "option_values" ("optionGroupId","label","priceDelta","sortOrder")
SELECT og.id, x.label, 0, x.so
FROM "option_groups" og JOIN "products" p ON p.id=og."productId"
JOIN (VALUES ('사이즈','A4',0),('사이즈','A3',1),('컬러','화이트',0),('컬러','블랙',1)) AS x(g,label,so) ON x.g=og.name
WHERE p.slug='carrier-box';

-- 자석박스
WITH p AS (SELECT id FROM "products" WHERE slug='magnetic-box')
INSERT INTO "option_groups" ("productId","name","required","sortOrder")
SELECT p.id, v.name, true, v.so FROM p, (VALUES ('사이즈',0),('마감',1)) AS v(name,so);
INSERT INTO "option_values" ("optionGroupId","label","priceDelta","sortOrder")
SELECT og.id, x.label, 0, x.so
FROM "option_groups" og JOIN "products" p ON p.id=og."productId"
JOIN (VALUES ('사이즈','A4',0),('사이즈','A3',1),('마감','무광',0),('마감','유광',1)) AS x(g,label,so) ON x.g=og.name
WHERE p.slug='magnetic-box';

-- 3공바인더
WITH p AS (SELECT id FROM "products" WHERE slug='binding-3-ring')
INSERT INTO "option_groups" ("productId","name","required","sortOrder")
SELECT p.id, v.name, true, v.so FROM p, (VALUES ('형태',0),('사이즈',1)) AS v(name,so);
INSERT INTO "option_values" ("optionGroupId","label","priceDelta","sortOrder")
SELECT og.id, x.label, 0, x.so
FROM "option_groups" og JOIN "products" p ON p.id=og."productId"
JOIN (VALUES ('형태','인쇄형',0),('형태','원단형',1),('사이즈','A4',0),('사이즈','B5',1)) AS x(g,label,so) ON x.g=og.name
WHERE p.slug='binding-3-ring';

-- PT용바인더
WITH p AS (SELECT id FROM "products" WHERE slug='binding-pt')
INSERT INTO "option_groups" ("productId","name","required","sortOrder")
SELECT p.id, v.name, true, v.so FROM p, (VALUES ('형태',0),('사이즈',1)) AS v(name,so);
INSERT INTO "option_values" ("optionGroupId","label","priceDelta","sortOrder")
SELECT og.id, x.label, 0, x.so
FROM "option_groups" og JOIN "products" p ON p.id=og."productId"
JOIN (VALUES ('형태','인쇄형',0),('형태','원단형',1),('사이즈','A4',0),('사이즈','A5',1)) AS x(g,label,so) ON x.g=og.name
WHERE p.slug='binding-pt';

-- 하드커버스프링제본
WITH p AS (SELECT id FROM "products" WHERE slug='binding-hardcover')
INSERT INTO "option_groups" ("productId","name","required","sortOrder")
SELECT p.id, v.name, true, v.so FROM p, (VALUES ('형태',0),('사이즈',1)) AS v(name,so);
INSERT INTO "option_values" ("optionGroupId","label","priceDelta","sortOrder")
SELECT og.id, x.label, 0, x.so
FROM "option_groups" og JOIN "products" p ON p.id=og."productId"
JOIN (VALUES ('형태','인쇄형',0),('형태','원단형',1),('사이즈','A4',0)) AS x(g,label,so) ON x.g=og.name
WHERE p.slug='binding-hardcover';

-- 내지 인쇄
WITH p AS (SELECT id FROM "products" WHERE slug='paper-inner')
INSERT INTO "option_groups" ("productId","name","required","sortOrder")
SELECT p.id, '용지', true, 0 FROM p;
INSERT INTO "option_values" ("optionGroupId","label","priceDelta","sortOrder")
SELECT og.id, x.label, 0, x.so
FROM "option_groups" og JOIN "products" p ON p.id=og."productId"
JOIN (VALUES ('모조지',0),('스노우지',1),('아트지',2),('수입지',3),('질감용지',4)) AS x(label,so) ON og.name='용지'
WHERE p.slug='paper-inner';

-- ── 3. 단가표: 내지 (페이지 50/100/200 × 수량 4구간) ─
INSERT INTO "price_paper" ("paper","qtyTier","pageCount","unitPrice") VALUES
  -- 모조지 (페이지당 25/22/18/15원 × 페이지수)
  ('MOJO','1',50,1250),('MOJO','2-4',50,1100),('MOJO','5-9',50,900),('MOJO','10+',50,750),
  ('MOJO','1',100,2500),('MOJO','2-4',100,2200),('MOJO','5-9',100,1800),('MOJO','10+',100,1500),
  ('MOJO','1',200,5000),('MOJO','2-4',200,4400),('MOJO','5-9',200,3600),('MOJO','10+',200,3000),
  -- 스노우지 (40/35/30/25)
  ('SNOW','1',50,2000),('SNOW','2-4',50,1750),('SNOW','5-9',50,1500),('SNOW','10+',50,1250),
  ('SNOW','1',100,4000),('SNOW','2-4',100,3500),('SNOW','5-9',100,3000),('SNOW','10+',100,2500),
  ('SNOW','1',200,8000),('SNOW','2-4',200,7000),('SNOW','5-9',200,6000),('SNOW','10+',200,5000),
  -- 아트지 (55/48/42/35)
  ('ART','1',50,2750),('ART','2-4',50,2400),('ART','5-9',50,2100),('ART','10+',50,1750),
  ('ART','1',100,5500),('ART','2-4',100,4800),('ART','5-9',100,4200),('ART','10+',100,3500),
  ('ART','1',200,11000),('ART','2-4',200,9600),('ART','5-9',200,8400),('ART','10+',200,7000),
  -- 수입지 (120/105/90/75)
  ('IMPORT','1',50,6000),('IMPORT','2-4',50,5250),('IMPORT','5-9',50,4500),('IMPORT','10+',50,3750),
  ('IMPORT','1',100,12000),('IMPORT','2-4',100,10500),('IMPORT','5-9',100,9000),('IMPORT','10+',100,7500),
  ('IMPORT','1',200,24000),('IMPORT','2-4',200,21000),('IMPORT','5-9',200,18000),('IMPORT','10+',200,15000),
  -- 질감용지 (180/160/140/120)
  ('TEXTURE','1',50,9000),('TEXTURE','2-4',50,8000),('TEXTURE','5-9',50,7000),('TEXTURE','10+',50,6000),
  ('TEXTURE','1',100,18000),('TEXTURE','2-4',100,16000),('TEXTURE','5-9',100,14000),('TEXTURE','10+',100,12000),
  ('TEXTURE','1',200,36000),('TEXTURE','2-4',200,32000),('TEXTURE','5-9',200,28000),('TEXTURE','10+',200,24000);

-- ── 4. 단가표: 제본 ───────────────────
INSERT INTO "price_binding" ("binding","qtyTier","variant","unitPrice") VALUES
  ('PRINTED','1','인쇄형',8000),('PRINTED','2-4','인쇄형',7000),('PRINTED','5-9','인쇄형',6000),('PRINTED','10+','인쇄형',5000),
  ('PRINTED','1','원단형',15000),('PRINTED','2-4','원단형',13000),('PRINTED','5-9','원단형',11000),('PRINTED','10+','원단형',9000),
  ('FABRIC','1','원단형',18000),('FABRIC','2-4','원단형',16000),('FABRIC','5-9','원단형',14000),('FABRIC','10+','원단형',12000);

-- ── 5. 단가표: 박스 ───────────────────
INSERT INTO "price_box" ("category","qtyTier","variant","unitPrice") VALUES
  ('CARRIER_BOX','1','A4',12000),('CARRIER_BOX','2-4','A4',10000),('CARRIER_BOX','5-9','A4',8500),('CARRIER_BOX','10+','A4',7000),
  ('CARRIER_BOX','1','A3',16000),('CARRIER_BOX','2-4','A3',14000),('CARRIER_BOX','5-9','A3',12000),('CARRIER_BOX','10+','A3',10000),
  ('MAGNETIC_BOX','1','A4',18000),('MAGNETIC_BOX','2-4','A4',15500),('MAGNETIC_BOX','5-9','A4',13500),('MAGNETIC_BOX','10+','A4',11500),
  ('MAGNETIC_BOX','1','A3',25000),('MAGNETIC_BOX','2-4','A3',22000),('MAGNETIC_BOX','5-9','A3',19000),('MAGNETIC_BOX','10+','A3',16500);

-- ── 6. FAQ ────────────────────────────
INSERT INTO "faqs" ("category","question","answer","sortOrder","updatedAt") VALUES
  ('주문','최소 주문 수량이 있나요?','1부부터 주문 가능합니다. 다만 수량 구간(1 / 2-4 / 5-9 / 10+)에 따라 단가가 달라집니다.',0,NOW()),
  ('주문','주문 후 취소·변경이 가능한가요?','결제 직후~제작 전까지 가능합니다. 제작 시작 후에는 취소가 어려우니 1:1 문의로 연락 주세요.',1,NOW()),
  ('결제','어떤 결제 수단을 지원하나요?','사이다페이를 통해 신용카드/계좌이체/가상계좌를 지원합니다. 세금계산서가 필요하시면 메모란에 기재해 주세요.',2,NOW()),
  ('결제','세금계산서 발행이 가능한가요?','가능합니다. 결제 시 사업자등록번호와 이메일을 메모에 남겨 주시면 발행해 드립니다.',3,NOW()),
  ('배송','배송비는 얼마인가요?','택배 배송 2,500원, 30,000원 이상 주문 시 무료배송입니다. 직접 방문 수령은 무료입니다.',4,NOW()),
  ('배송','직접 수령이 가능한가요?','가능합니다. 주문 시 ''직접 방문 수령''을 선택하시면 배송비가 면제됩니다. 픽업 가능 시간은 평일 09:00~18:00입니다.',5,NOW()),
  ('제작','제작 기간은 얼마나 걸리나요?','통상 2~3 영업일이며, 수량과 옵션에 따라 최대 5 영업일이 소요될 수 있습니다.',6,NOW()),
  ('제작','파일은 어떻게 전달하나요?','결제 완료 후 안내드리는 Dropbox 링크에 업로드해 주세요. 또는 blackcopy2@naver.com 으로 첨부해 주셔도 됩니다.',7,NOW()),
  ('제작','어떤 파일 형식을 지원하나요?','PDF, AI, PSD를 권장합니다. 내지 인쇄는 300dpi 이상 PDF가 가장 안정적입니다.',8,NOW()),
  ('기타','샘플을 받아볼 수 있나요?','네, 1:1 문의로 회사명/주소를 남겨 주시면 카탈로그와 샘플 키트를 발송해 드립니다 (무료).',9,NOW());

-- ── 7. 공지사항 ───────────────────────
INSERT INTO "notices" ("title","content","isPinned","updatedAt") VALUES
  ('제안서몰 오픈 — 신규 가입 5% 할인 EVENT',
   E'안녕하세요, 제안서몰입니다. 오픈을 기념하여 첫 주문 시 5% 자동 할인이 적용됩니다.\n인쇄·제본·박스 모든 카테고리에 적용되며, 다른 쿠폰과 중복 사용이 가능합니다.',
   true, NOW());

COMMIT;
