const express = require('express');
const fs = require("fs");
const ejs = require("ejs");
const bodyParser = require('body-parser');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const { MongoClient } = require('mongodb');

const app = express();
const url = "mongodb://localhost:27017/";
const dbName = "maidong";

var userdb = [];
var managerdb = [];
var dishesdb = [];
var orderdb = [];
var orderNum = 5;


async function connectToMongoDB() {
    const client = new MongoClient(url);
    try {
        await client.connect();
        console.log("The database is connected!");
        const db = client.db(dbName);


        await initMongoDBData(db);


        await client.close();
    } catch (err) {
        console.error(err);
    }
}


async function initMongoDBData(db) {
    var initMongodbData = JSON.parse(fs.readFileSync('./initMongodbData.json'));


    await db.collection("user").deleteMany({});
    await db.collection("user").insertMany(initMongodbData.user);
    userdb = initMongodbData.user;


    await db.collection("manager").deleteMany({});
    await db.collection("manager").insertMany(initMongodbData.manager);
    managerdb = initMongodbData.manager;


    await db.collection("dishes").deleteMany({});
    await db.collection("dishes").insertMany(initMongodbData.dishes);
    dishesdb = initMongodbData.dishes;


    await db.collection("order").deleteMany({});
    await db.collection("order").insertMany(initMongodbData.order);
    orderdb = initMongodbData.order;
}


connectToMongoDB();


app.set("view engine", 'ejs');

app.set("views", __dirname);


app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use(cookieParser());
app.use(multer({ dest: '/tmp/' }).array('image'));


function login(username, password) {
    for (var item in userdb) {
        if (username == userdb[item].username && password == userdb[item].password)
            return true;
    }
    return false;
}

function adminlogin(username, password) {
    for (var item in managerdb) {
        if (username == managerdb[item].username && password == managerdb[item].password)
            return true;
    }
    return false;
}

function isuserlogined(cookies) {
    return login(cookies.username, cookies.password);
}

function isadminlogined(cookies) {
    return adminlogin(cookies.username, cookies.password);
}


async function registe(username, password) {
    const client = new MongoClient(url );
    try {
        await client.connect();
        const db = client.db(dbName);
        const userCollection = db.collection("user");

        const existingUser = await userCollection.findOne({ username: username });
        if (!existingUser) {
            await userCollection.insertOne({ username: username, password: password });
            console.log("User Registration Successful");
            userdb.push({ username: username, password: password });
            return true;
        } else {
            console.log("Username already exists");
            return false;
        }
    } catch (err) {
        console.error(err);
        return false;
    } finally {
        await client.close();
    }
}

function getsingleorder(orderID) {
    for (var item in orderdb) {
        if (orderdb[item].orderID == orderID) {
            return orderdb[item];
        }
    }
    return {};
}


async function deliverorder(orderID) {
    const client = new MongoClient(url );
    try {
        await client.connect();
        const db = client.db(dbName);
        const orderCollection = db.collection("order");

        const updatedResult = await orderCollection.updateOne(
            { orderID: orderID },
            { $set: { orderStateNum: 2 } }
        );
        if (updatedResult.modifiedCount === 1) {
            console.log("Orders start to be dispatched");
            return true;
        }
        return false;
    } catch (err) {
        console.error(err);
        return false;
    } finally {
        await client.close();
    }
}


async function completeorder(orderID) {
    const client = new MongoClient(url );
    try {
        await client.connect();
        const db = client.db(dbName);
        const orderCollection = db.collection("order");

        const updatedResult = await orderCollection.updateOne(
            { orderID: orderID },
            { $set: { orderStateNum: 3 } }
        );
        if (updatedResult.modifiedCount === 1) {
            console.log("Order Completed");
            return true;
        }
        return false;
    } catch (err) {
        console.error(err);
        return false;
    } finally {
        await client.close();
    }
}


async function cancelorder(orderID) {
    const client = new MongoClient(url );
    try {
        await client.connect();
        const db = client.db(dbName);
        const orderCollection = db.collection("order");

        const updatedResult = await orderCollection.updateOne(
            { orderID: orderID },
            { $set: { orderStateNum: 4 } }
        );
        if (updatedResult.modifiedCount === 1) {
            console.log("订单已取消");
            return true;
        }
        return false;
    } catch (err) {
        console.error(err);
        return false;
    } finally {
        await client.close();
    }
}


async function adddish(data) {
    const client = new MongoClient(url );
    try {
        await client.connect();
        const db = client.db(dbName);
        const dishesCollection = db.collection("dishes");

        const existingDish = await dishesCollection.findOne({ name: data.name });
        if (!existingDish) {
            await dishesCollection.insertOne({ name: data.name, price: data.price });
            console.log("The dish was added successfully");
            dishesdb.push({ name: data.name, price: data.price });
            return true;
        } else {
            console.log("The dish already exists");
            return false;
        }
    } catch (err) {
        console.error(err);
        return false;
    } finally {
        await client.close();
    }
}


async function modifidish(data) {
    const client = new MongoClient(url);
    try {
        await client.connect();
        const db = client.db(dbName);
        const dishesCollection = db.collection("dishes");

        // 确保价格字段是数字类型
        const newPrice = parseFloat(data.newprice);
        if (isNaN(newPrice)) {
            console.error("Price is not a valid number");
            return false;
        }

        const updatedResult = await dishesCollection.updateOne(
            { name: data.name }, // 确保查询条件能够准确匹配要更新的文档
            { $set: { name: data.newname, price: newPrice } }
        );

        if (updatedResult.modifiedCount === 1) {
            console.log("The dish information was updated successfully");
            return true;
        } else {
            console.log("No documents matched the query. Updated 0 documents.");
            return false;
        }
    } catch (err) {
        console.error(err);
        return false;
    } finally {
        await client.close();
    }
}



async function removedish(data) {
    const client = new MongoClient(url, { useUnifiedTopology: true });
    try {
        await client.connect();
        const db = client.db(dbName);
        const dishesCollection = db.collection("dishes");


        const price = parseFloat(data.price);

        const deleteResult = await dishesCollection.deleteOne({
            name: data.name,
            price: price  // 使用转换后的数字
        });

        if (deleteResult.deletedCount === 1) {
            console.log("Dishes deleted successfully");
            return true;
        }
        return false;
    } catch (err) {
        console.error(err);
        return false;
    } finally {
        await client.close();
    }
}


function toJSON(status = '', msg = '', data = {}) {
    return { status, msg, data };
}


app.get('/', function (req, res) {
    res.render('views\\dishes.ejs');
});

app.get("/order", function (req, res) {
    res.render('views\\order.ejs');
});

app.get("/admin", function (req, res) {
    res.render('views\\adminlogin.ejs');
});

app.get("/orderDetail", function (req, res) {
    if (isadminlogined(req.cookies)) {
        res.render('views\\orderDetail.ejs');
    } else {
        res.render('views\\adminlogin.ejs');
    }
    res.end();
});

app.get("/orderManage", function (req, res) {
    if (isadminlogined(req.cookies)) {
        res.render('views\\orderManage.ejs');
    } else {
        res.render('views\\adminlogin.ejs');
    }
    res.end();
});

app.get("/dishManage", function (req, res) {
    if (isadminlogined(req.cookies)) {
        res.render('views\\dishManage.ejs');
    } else {
        res.render('views\\adminlogin.ejs');
    }
    res.end();
});

app.post('/login', async function (req, res) {
    const login_state = login(req.body.username, req.body.password);
    if (login_state) {
        const data = {
            username: req.body.username,
            success: login_state
        };
        res.cookie('username', req.body.username);
        res.cookie('password', req.body.password);
        res.json(toJSON('200', 'Login Successful', data));
    } else {
        const data = {
            username: null,
            success: login_state
        };
        res.json(toJSON('200', 'Login Failure', data));
    }
    res.end();
});

app.post('/adminlogin', async function (req, res) {
    const login_state = adminlogin(req.body.username, req.body.password);
    if (login_state) {
        const data = {
            username: req.body.username,
            success: login_state
        };
        res.cookie('username', req.body.username);
        res.cookie('password', req.body.password);
        res.json(toJSON('200', 'Administrator Login Success', data));
    } else {
        const data = {
            username: null,
            success: login_state
        };
        res.json(toJSON('200', 'Administrator Login Failure', data));
    }
    res.end();
});

app.post('/logout', function (req, res) {
    res.clearCookie('username');
    res.clearCookie('password');
    const data = {};
    res.json(toJSON('200', 'Logout Successful', data));
    res.end();
});

app.post('/dishes', function (req, res) {
    const data = dishesdb;
    res.json(toJSON('200', 'Get fast food data successfully', data));
    res.end();
});

app.post('/orders', function (req, res) {
    const data = orderdb;
    res.json(toJSON('200', 'Get Order Data Successfully', data));
    res.end();
});

app.post('/adddish', async function (req, res) {
    const addFlag = await adddish(req.body);
    const data = {
        success: addFlag
    };
    if (addFlag)
        res.json(toJSON('200', 'The dish was added successfully', data));
    else
        res.json(toJSON('200', 'Failed to add dish', data));
    res.end();
});

app.post('/modifidish', async function (req, res) {
    const modifyFlag = await modifidish(req.body);
    const data = {
        success: modifyFlag
    };
    if (modifyFlag)
        res.json(toJSON('200', 'Modify dish information successfully', data));
    else
        res.json(toJSON('200', 'Failed to modify dish information', data));
    res.end();
});

app.post('/removedish', async function (req, res) {
    const removeFlag = await removedish(req.body);
    const data = {
        success: removeFlag
    };
    if (removeFlag)
        res.json(toJSON('200', 'Dish Removal Success', data));
    else
        res.json(toJSON('200', 'Failed to remove dish', data));
    res.end();
});

app.post('/createorder', async function (req, res) {
    const client = new MongoClient(url );
    try {
        await client.connect();
        const db = client.db(dbName);
        const orderCollection = db.collection("order");

        const order = {
            orderID: (++orderNum).toString(),
            username: req.body.username,
            order: req.body.order,
            liuyan: req.body.liuyan
        };

        await orderCollection.insertOne(order);
        orderdb.push(order);
        console.log("Order created successfully");
        const data = {
            success: true
        }
        res.json(toJSON('200', 'Order created successfully', data));
    } catch (err) {
        console.error(err);
        const data = {
            success: false
        }
        res.json(toJSON('200', 'Order creation failure', data));
    } finally {
        await client.close();
    }
    res.end();
});

app.post('/deliverorder', async function (req, res) {
    const deliverFlag = await deliverorder(req.body.orderID);
    const data = {
        success: deliverFlag
    };
    if (deliverFlag)
        res.json(toJSON('200', 'Delivery of the order has begun', data));
    else
        res.json(toJSON('200', 'Order Delivery Failure', data));
    res.end();
});

app.post('/completeorder', async function (req, res) {
    const completeFlag = await completeorder(req.body.orderID);
    const data = {
        success: completeFlag
    };
    if (completeFlag)
        res.json(toJSON('200', 'Order Completed', data));
    else
        res.json(toJSON('200', 'Failed to complete order', data));
    res.end();
});

app.post('/cancelorder', async function (req, res) {
    const cancelFlag = await cancelorder(req.body.orderID);
    const data = {
        success: cancelFlag
    };
    if (cancelFlag)
        res.json(toJSON('200', 'Order cancelled', data));
    else
        res.json(toJSON('200', 'Order cancellation failure', data));
    res.end();
});

app.post('/singleOrder', function (req, res) {
    const data = getsingleorder(req.body.orderID);
    res.json(toJSON('200', 'Get Order Success', data));
    res.end();
});

app.post('/registe', async function (req, res) {
    const registeFlag = await registe(req.body.username, req.body.password);
    if (registeFlag) {
        const data = { username: req.body.username, success: true };
        res.json(toJSON('200', 'Successful registration', data));
    } else {
        const data = { username: req.body.username, success: false };
        res.json(toJSON('200', 'registration failure', data));
    }
    res.end();
});


var server = app.listen(8081, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("application instance, accessed at http://%s:%s", host, port);
});

app.post('/file_upload', function (req, res) {
    console.log(req.files[0]);  // 上传的文件信息
    var des_file = __dirname + "/upload/" + req.files[0].originalname;
    fs.readFile(req.files[0].path, function (err, data) {
        fs.writeFile(des_file, data, function (err) {
            if (err) {
                console.log(err);
            } else {
                var response = {
                    message: 'File uploaded successfully',
                    filename: req.files[0].originalname
                };
            }
            console.log(response);
            res.end(JSON.stringify(response));
        });
    });
});


app.post('/process_post', function(req, res) {
    var response = {
        first_name: req.body.first_name,
        last_name: req.body.last_name
    };
    console.log(response);
    res.end(JSON.stringify(response));
});

