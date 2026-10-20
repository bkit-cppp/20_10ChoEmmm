// Thay ảnh, lời nhắn và nhạc tại đây. Không cần cài thư viện hay chạy build.
window.GIFT_CONFIG = {
  photos: Array.from({length: 8}, (_, i) => `assets/photo-${i + 1}.jpg`),
  contentVersion: 'beiu-2010-v1',
  message: 'Anh biết anh còn nhiều thiếu sót, không đẹp, không giàu, có hơi không tinh tế, nhưng với anh vũ trụ này anh chỉ có em và anh nhất định đón em nhà về đúng kế hoạch, không hẹn không chậm trễ gì nữa cả, chúc beiu 20/10 vui vẻ hạnh phúc, mãi là cô giáo iuuuuu của anh nhaaaa',
  signature: '',
  wishes: ['Chúc em ngày 20/10 thật hạnh phúc', 'Cảm ơn em vì đã luôn ở đây', '20 tháng 10, luôn bên em nhé', 'Cả thế giới của anh là em', 'Mãi yêu em, cô gái nhỏ', 'Bông hoa đẹp nhất của anh', 'Cầm tay anh, tựa vai anh', 'Có em, mỗi ngày đều thật đẹp', 'Yêu em hơn những vì sao', 'Dù xa cách, vẫn gần em thôi'],
  autoPlay: true,
  // Tính từ lúc bắt đầu mỗi cảnh, đơn vị mili giây.
  durations: {intro: 8200, card: 8500, memories: 11000, sphere: 8500, gallery: 7000, envelope: 4200}
};
