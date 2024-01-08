// MongoDB 数据库模块
const { MongoClient } = require('mongodb');
let DB_CONN_STR = null;

/**
 * 数据库连接函数
 * @param dbName 数据库名字
 */
function connect(dbName) {
    return new Promise((resolve, reject) => {
        MongoClient.connect(DB_CONN_STR , function (err, client) {
            if (err) {
                reject(err);
                return;
            }
            console.log("连接成功！");
            const db = client.db(dbName);
            resolve({ db, client });
        });
    });
}

/**
 * 数据库操作
 * @param op 操作的名字
 * @returns {Function}
 */
function operation(op) {
    return function (collectionName, dbName, data1, data2) {
        return new Promise((resolve, reject) => {
            connect(dbName).then(({ db, client }) => {
                const collection = db.collection(collectionName);
                switch (op) {
                    case 'insert':
                        collection.insertOne(data1, returnResult);
                        break;
                    case 'update':
                        collection.updateOne(data1, { $set: data2 }, returnResult);
                        break;
                    case 'find':
                        collection.find(data1).toArray(returnResult);
                        break;
                    case 'remove':
                        collection.deleteOne(data1, returnResult);
                        break;
                }
                function returnResult(err, result) {
                    if (err) {
                        reject(err);
                        client.close();
                        return;
                    }
                    resolve(result);
                    client.close();
                }
            }).catch(reject);
        });
    };
}

function init(str) {
    DB_CONN_STR = str;
}

module.exports = {
    insert: operation('insert'),
    find: operation('find'),
    update: operation('update'),
    remove: operation('remove'),
    init: init
};
