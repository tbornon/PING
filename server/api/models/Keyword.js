'use strict';

const mongoose = require('../helpers/mongo');
const Schema = mongoose.Schema;

//Comment Class
const KeywordSchema = new Schema({
    displayName: String,
    lcName: String
});
const Keyword = mongoose.model('Keyword', KeywordSchema);

module.exports = Keyword;