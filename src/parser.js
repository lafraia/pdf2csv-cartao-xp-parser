const { PdfReader } = require("pdfreader");

if (!process.argv[2]) {
    console.log("Usage: node parser.js <filename> <password>");
    process.exit();
}

var prepareStart = start = ignore = get = closingDate = false;
var transaction = [];
var transactionAll = [];
var DEBUG = true;
var options = {};

if (process.argv[3]) {
    options = { password: process.argv[3] };
}

new PdfReader(options).parseFileItems(process.argv[2],
    function (err, item) {
        if (err) {
            console.error(err);
        } else if (!item) {
            if (DEBUG) console.warn(transactionAll);
            var sum = 0;
            console.log("DATE,DESCRIPTION,VALUE,EXTRA");
            for (let i = 0; i < transactionAll.length; i++) {
                let date = transactionAll[i].date;
                console.log(date.getFullYear()+"-"+(date.getMonth() + 1)+"-"+date.getDate() + "," + transactionAll[i].description + "," + transactionAll[i].amount.toFixed(2) + (transactionAll[i].extra ? (",\"" + transactionAll[i].extra + "\"") : ""));
                if (transactionAll[i].amount > 0) {
                    sum += transactionAll[i].amount;
                }
            }
            console.error("Sum: " + sum);
            console.error("ClosingDate: " + closingDate.day + "/" + closingDate.month + "/" + closingDate.year);
        } else if (ignore) {
            ignore--;
            return;
        } else if (prepareStart && !start && item.text.includes("US$")) {
            if (DEBUG) console.warn(":START: " + item.text);
            start = true;
            get = false;
            return;
        } else if (item && item.text) {
            if (!closingDate && item.text.match(/^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/)) {
                let matches = item.text.match(/^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/);
                closingDate = {'day': matches[1], 'month': matches[2], 'year': matches[3]};
                if (DEBUG) console.warn("CLOSING DATE: "+item.text);
            } else if (item.text.includes("TOTAL FATURA ANTERIOR")) {
                if (DEBUG) console.warn(":IGNORE: " + item.text);
                ignore = 1;
                return;
            } else if (item.text.includes("Descrição")) {
                if (DEBUG) console.warn("====================================");
                if (DEBUG) console.warn(item.text);
                prepareStart = true;
                start = false;
                return;
            }
            if (DEBUG) console.warn(": " + item.text);
        }

        if (item && item.page) {
            prepareStart = start = ignore = get = false;
            transaction = [];
            if (DEBUG) console.warn("//////////////////////////////////// NEW PAGE \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\");
            if (DEBUG) console.warn(item);
        }

        if (start && item && item.text) {
            if (!get) {
                get = 2;
                transaction['description'] = item.text.replace(/^PARC\=\d+/i, "");
                if (DEBUG) console.warn("--- Description: " + item.text);
                return;
            } else if (get == 2) {
                if (item.text.match(/C.mbio (?:US|R)\$ \d{1,2}\,\d{2}/)) {
                    let matches = item.text.match(/C.mbio (?:US|R)\$ (\d{1,2}\,\d{2})/);
                    // Cambio é colocado em outra coluna, é preciso adaptar o último item encontrado
                    if (DEBUG) console.warn("CAMBIO FOUND: " + item.text);
                    let lastTransaction = transactionAll.pop();
                    lastTransaction['extra'] = "US$ " + transaction.description + " / Câmbio: " + matches[1];
                    transactionAll.push(lastTransaction);
                    if (DEBUG) console.warn("============ Last transaction replaced");
                    if (DEBUG) console.warn(lastTransaction);
                    get = false;
                    return;
                } else if (!transaction.date && item.text.match(/^[0-9]{2}\/[0-9]{2}$/)) {
                    get--;
                    if (DEBUG) console.warn(":: DATE FOUND: " + item.text);
                    let matches = item.text.match(/^([0-9]{2})\/([0-9]{2})$/);
                    let originalDate = (matches[2] > closingDate.month ? closingDate.year - 1 : closingDate.year) + "-" + matches[2] + "-" + matches[1];
                    if (DEBUG) console.warn(":: ORIGINAL DATE: " + originalDate);
                    if (transaction['description'].match(/PARC\.(\d+)\/(\d+)/i)) {
                        let matches2 = transaction['description'].match(/PARC\.(\d+)\/(\d+)/i);
                        if (DEBUG) console.warn(":: COMPRA PARCELADA: Parcela " + matches2[1] + " de " + matches2[2]);
                        transaction['extra'] = "Parc " + matches2[1] + "/" + matches2[2];
                        
                        if (matches2[1] > 1) { // not first installment
                            let date = new Date(originalDate);
                            let newDate = new Date(date.setMonth(date.getMonth() + (matches2[1] - 1)));
                            transaction['date'] = newDate;
                            return;
                        }
                    }
                    transaction['date'] = new Date(originalDate);
                } else {
                    if (DEBUG) console.warn(":: NOT DATE: " + item.text);
                    transaction = [];
                    start = false;
                    prepareStart = false;
                    return;
                }
            } else if (get == 1) {
                if (transaction['date'] && transaction['description'] && item.text.match(/^[0-9\,\.\-]+$/)) {
                    transaction['amount'] = parseFloat(item.text.replace(/\./g, "").replace(/\,/g, "."));
                    get = false;
                    if (DEBUG) console.warn(transaction);
                    transactionAll.push(transaction);
                }
                transaction = [];
            }
        }
    }
  );
  