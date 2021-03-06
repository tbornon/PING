'use strict';

const mongoose = require('../helpers/mongo');

const YearSchema = mongoose.Schema({
    name: {
        fr: {
            type: String,
            required: true
        },
        en: {
            type: String,
            required: true
        }
    },
    abbreviation: {
        type: String,
        required: true
    }
});

const Year = mongoose.model('Year', YearSchema);

module.exports = Year;