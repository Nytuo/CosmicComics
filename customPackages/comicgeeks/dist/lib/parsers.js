"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
exports.default = {
    Issue: $ => (_, el) => {
        const element = $(el);
        const cover = element.find('.comic-cover-art img').attr('data-src').replace('medium', 'large');
        const [publisher] = element.find('.comic-details').text().split('·');
        const description = element.find('.comic-description.col-feed-max');
        const url = `${constants_1.BASE_URL}${description.find('a').attr('href')}`;
        const pulls = element.attr('data-pulls');
        const potw = element.attr('data-potw');
        const rating = element.attr('data-community');
        description.find('a').remove();
        return {
            name: element.find('.title.color-primary').text().trim(),
            publisher: publisher === null || publisher === void 0 ? void 0 : publisher.trim(),
            url,
            cover: cover === '/assets/images/no-cover-med.jpg' ? `${constants_1.BASE_URL}${cover.replace('-med', '-lg')}` : cover,
            description: description.text().trim(),
            price: element.find('.price').text().trim(),
            rating: (rating === null || rating === void 0 ? void 0 : rating.length) ? Number(rating) : null,
            pulls: (pulls === null || pulls === void 0 ? void 0 : pulls.length) ? Number(pulls) : null,
            potw: (potw === null || potw === void 0 ? void 0 : potw.length) ? Number(potw) : null
        };
    },
    Series: $ => (_, el) => {
        const element = $(el);
        return {
            name: element.find('.title.color-primary').text().trim(),
            publisher: element.find('.publisher.color-offset').text().trim(),
            url: `${constants_1.BASE_URL}${element.find('.cover a').attr('href')}`,
            cover: element.find('.cover img').attr('data-src').replace('medium', 'large')
        };
    },
    IssuesSearch: $=> (_, el) => {
        const element = $(el);
        const pulls = element.attr('data-pulls');
        const date = element.find(".date");
        const rating = element.attr('data-community');

        return {
            name: element.find('.title.color-primary').text().trim(),
            publisher: element.find('.publisher.color-offset').text().trim(),
            url: `${constants_1.BASE_URL}${element.find('.cover a').attr('href')}`,
            cover: element.find('.cover img').attr('data-src').replace('medium', 'large'),
            price: element.find('.price').text().trim(),
            pulls: (pulls === null || pulls === void 0 ? void 0 : pulls.length) ? Number(pulls) : null,
            date: date.text().trim(),
            rating: (rating === null || rating === void 0 ? void 0 : rating.length) ? Number(rating) : null,
            pulls: (pulls === null || pulls === void 0 ? void 0 : pulls.length) ? Number(pulls) : null
        }
    }
};
