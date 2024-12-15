const express = require("express");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
const path = require('path');
const bcrypt = require('bcryptjs');
var fs = require('fs');
const multer = require('multer');
const session = require('express-session');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

dotenv.config();

const upload = multer({ dest: 'uploads/' });
const uri = process.env.MONGO_URI;
mongoose.connect("mongodb+srv://KabulTime:KabulTime_12345@cluster0.yfxcz.mongodb.net/ShopDB?retryWrites=true&w=majority&appName=Cluster0");
const app = express();
exports.app = app;
app.use(bodyparser.json())
app.use(bodyparser.urlencoded({ extended: true }));
app.use(session({
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: true
}));
app.use(express.static("assets"));

app.set('view engine', 'ejs');

app.get('/', function (req, res) {
  if (req.session.user) {
   
        res.render('home')
    }else{
      res.redirect('/login');
  }
})
app.get('/backupr', function (req, res) {
  if (req.session.user) {
   
        res.render('backup')
  
    }else{
      res.redirect('/login');
  }
})
app.post('/backup', async (req, res) => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
      await client.connect();
      console.log('Connected to MongoDB');
      const db = client.db(); // Use the default database or specify one
      const collections = await db.listCollections().toArray();

      for (const collection of collections) {
          const colName = collection.name;
          const data = await db.collection(colName).find({}).toArray();
          const filePath = path.join(__dirname, 'uploads', `backup_${colName}.json`);
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
          console.log(`Backup created for collection: ${colName}`);
      }

      res.send('Backup completed successfully. Files created: ' + collections.map(c => `backup_${c.name}.json`).join(', '));
  } catch (err) {
      console.error('Error creating backup:', err);
      res.status(500).send('Error creating backup');
  } finally {
      await client.close();
  }
});

// Restore route
app.post('/restore', async (req, res) => {
  const client = new MongoClient(uri);
  const uploadsDir = path.join(__dirname, 'uploads');

  try {
      await client.connect();
      console.log('Connected to MongoDB');

      const db = client.db();
      
      // Read all JSON files from the uploads directory
      const files = fs.readdirSync(uploadsDir).filter(file => 
          file.endsWith('.json') // Ensure only JSON files are processed
      );

      for (const file of files) {
          const filePath = path.join(uploadsDir, file);
          console.log(`Restoring data from file: ${filePath}`);

          // Check if it's a file before reading
          if (fs.statSync(filePath).isFile()) {
              const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
              const collectionName = file.replace('backup_', '').replace('.json', '');
              
              // Check if data is an array and not empty
              if (Array.isArray(data) && data.length > 0) {
                  await db.collection(collectionName).deleteMany({}); // Clear existing data
                  await db.collection(collectionName).insertMany(data); // Restore data
                  console.log(`Restored collection: ${collectionName}`);
              } else {
                  console.warn(`No data to restore for collection: ${collectionName}`);
              }
          } else {
              console.warn(`Skipping non-file: ${filePath}`);
          }
      }

      res.send('Database restored successfully from backup files.');
  } catch (err) {
      console.error('Error restoring database:', err);
      res.status(500).send('Error restoring database');
  } finally {
      await client.close();
  }
});
function isAuthenticated(req, res, next) {
  if (req.session.user) {
      return next(); // User is authenticated
  }
  res.redirect('/'); // Redirect to login if not authenticated
}

// Middleware to check user role
function isAuthorized(role) {
  return (req, res, next) => {
      if (req.session.user && req.session.user.role === role) {
          return next(); // User has the required role
      }
      res.status(403).send('Access denied.'); // User does not have access
  };
}

app.get('/stock', function (req, res) {
  if (req.session.user) {
  stock.find().sort({ createdAt: -1 }).then((pro) => {
    res.render("stock", { pro: pro })
  })
  }else{
    res.redirect('/login');
}
  
})
app.get('/userpage',isAuthorized('Admin'), function (req, res) {
  if (req.session.user) {
  user.find().sort({ createdAt: 1 }).then((pro) => {
    res.render("userpage", { pro: pro })
  })
  }else{
    res.redirect('/login');
}
  
})
app.get('/pricelist', function (req, res) {
  if (req.session.user) {
    pricelist.find().sort({ createdAt: -1 }).then((pro) => {
    
      stock.find().sort({createdAt:-1}).then((un)=>{
        res.render("pricelist", { pro: pro , un:un})
      })
    })
    }else {
      res.redirect('/login');
  }
  
    
  })

app.post('/updpri',function (req, res) {
  
  let rm = req.body.ur;
  let p = req.body.urm;
  let sc = req.body.sc;


  pricelist.findOneAndUpdate({ item: rm }, {
    price: parseInt(p),
    currency:sc,
    
  }).then(() => {
    res.redirect('/pricelist')
  })
  });

app.get('/purchasedeleted/:id/:n/:q', function (req, res) {
  let iid = req.params.id;
  let nn = req.params.n;
  let qq = parseInt(req.params.q);


  stock.findOneAndUpdate({ item: nn }, { $inc: { quantity: -qq } }).then(() => {
    purchase.findByIdAndDelete({ _id: iid }).then(() => {
    }).catch((error) => {
      res.status(500).json(error)
    });
    res.redirect("/purchase")
  });

})
app.get('/userdelete/:id',isAuthorized('Admin'), function (req, res) {
  let iid = req.params.id;
  user.find().then((all)=>{
  
  if (all.length>1) {
    user.findByIdAndDelete({ _id: iid }).then(() => {
    
    res.redirect("/userpage")
  });} else {
    res.redirect("/userpage")
  }
});
})
app.get('/purchase', function (req, res) {
  if (req.session.user) {
    pricelist.find().sort({ createdAt: -1 }).then((pro) => {
    
      stock.find().sort({createdAt:-1}).then((un)=>{
        res.render("pricelist", { pro: pro , un:un})
      })
    })
  purchase.find().sort({ createdAt: -1 }).then((pro) => {
    res.render("purchase", { pro: pro })
  })
   
    }else{
      res.redirect('/login');
  }
  

})
app.post('/newpurchase', function (req, res) {
  let n = req.body.pname
  let q = req.body.pquantity
  let u = req.body.sun;
  let sc = req.body.sc;
  let p = new purchase({
    name: req.body.pname,
    price: req.body.pprice,
    quantity: req.body.pquantity,
    unit: req.body.sun,
    currency:req.body.sc,
    total: req.body.total
  });

  stock.findOneAndUpdate({ item: n }, { $inc: { quantity: q }, $set: { unit: u } }, { new: true, upsert: true }).then((it) => { });
  pricelist.findOne({ item: n })
    .then((existingStock) => {
      if (!existingStock) {
        const pr = new pricelist({
          item: n,
        });

        return pr.save();
      }
    })
  p.save();
  res.redirect("/purchase")
})

app.get('/order1', function (req, res) {
  if (req.session.user) {
    order.findOne({}).sort({ _id: -1 }).then((all) => {
    customer.find({}).sort({ name: 1 }).then((ct) => {
      stock.find({}).sort({ item: 1 }).then((it) => {

        res.render('order1', { bb: all, cit: ct, iit: it })

      })
    })
  })
    }else{
      res.redirect('/login');
  }
  

});
app.get('/saleslist', function (req, res) {
  if (req.session.user) {
    Payment.find({}).sort({ _id: -1 }).then((all) => {

    res.render('saleslist', { bb: all })
  })
    }else{
      res.redirect('/login');
  }
  

});
app.get('/salesReport', function (req, res) {
  if (req.session.user) {
    order.find({}).sort({ _id: -1 }).then((all) => {

      res.render('salesReport', { bb: all })
  
    })
    }else{
      res.redirect('/login');
  }
});
app.get('/invoice', function (req, res) {
  if (req.session.user) {
    const id=req.body.findd;
    let pb=req.body.pp;
    order.find({bill:id}).then((all) => {
      Payment.find({billno:pb}).then((pay)=>{
        res.render('invoice', { bb: all,p:pay})
      })
        
      })
  
    }else{
      res.redirect('/login');
  }
});
app.post('/invoiceb', function (req, res) {
  if (req.session.user) {
    const id=req.body.findd;
    let pb=req.body.pp;
    order.find({bill:id}).then((all) => {
      Payment.findOne({billno:pb}).then((pay)=>{
        customer.find({}).then((cust)=>{
          res.render('saleinvoice', { bb: all,p:pay,cus:cust})
        })
        
      })
        
      })
    }else{
      res.redirect('/login');
  }
});

app.get('/order', function (req, res) {
  if (req.session.user) {
    order.findOne({}).sort({ _id: -1 }).then((all) => {
    
    res.render('order', { bb: all })

  })
    }else{
      res.redirect('/login');
  }
  


});
app.get('/price/:item', async (req, res) => {
  if (req.session.user) {
    try {
      const itemName = req.params.item;
      const priceItem = await pricelist.findOne({ item: itemName });
      if (priceItem) {
          res.status(200).send({ price: priceItem.price });
      } else {
          res.status(404).send({ message: 'Item not found' });
      }
  } catch (error) {
      res.status(500).send(error);
  }
    }else{
      res.redirect('/login');
  }
  
});
app.get('/unit/:item', async (req, res) => {
  if (req.session.user) {
   try {
      const itemName = req.params.item;
      const priceItem = await stock.findOne({ item: itemName });
      if (priceItem) {
          res.status(200).send({ unit: priceItem.unit });
      } else {
          res.status(404).send({ message: 'Item not found' });
      }
  } catch (error) {
      res.status(500).send(error);
  }
    }else{
      res.redirect('/login');
  }
  
});
app.get('/currency/:item', async (req, res) => {
  if (req.session.user) {
    try {
      const itemName = req.params.item;
      const priceItem = await pricelist.findOne({ item: itemName });
      if (priceItem) {
          res.status(200).send({ currency: priceItem.currency });
      } else {
          res.status(404).send({ message: 'Item not found' });
      }
  } catch (error) {
      res.status(500).send(error);
  }
    }else{
      res.redirect('/login');
  }
});

app.get('/stock/:item', async (req, res) => {
  if (req.session.user) {
    try {
      const itemName = req.params.item;
      const stockItem = await stock.findOne({ item: itemName });
      if (stockItem) {
          res.status(200).send({ quantity: stockItem.quantity });
      } else {
          res.status(404).send({ message: 'Item not found' });
      }
  } catch (error) {
      res.status(500).send(error);
  }
    }else{
      res.redirect('/login');
  }
  
});

app.post('/savedorder', function (req, res) {
  if (req.session.user) {
    const { scn,sc, sit, qquan, pprice,sunit, tt, gt, pd, rm, bil, bilno } = req.body;
  const entries = [];
  const p = new Payment({
    billno: req.body.biln,
    customern: req.body.scn,
    Paid: parseFloat(req.body.pd),
    Total: parseFloat(req.body.gt),
    currency:req.body.sc,
    remain: parseFloat(req.body.rm),
    discount: parseFloat(req.body.dis)
  });
  p.save();
  if (Array.isArray(sit)) {
    for (let i = 0; i < sit.length; i++) {
      
      const entry = new order({

        bill: parseFloat(bil),
        customer: scn,
        currency:sc,
        item: sit[i],
        unit: sunit[i],
        price: parseFloat(pprice[i]),
        quantity: parseInt(qquan[i]),
        totalAmount: parseFloat(tt[i])

      });
      entries.push(entry);
      stock.findOneAndUpdate({ item: sit[i] }, { $inc: { quantity: -qquan[i] } }).then((it) => { });
    }
    try {
      // Use Promise.all to save all entries concurrently
      Promise.all(entries.map(order => order.save()));

      res.redirect('/order1');
    } catch (error) {
      res.status(500).send('Error saving entries: ' + error.message);
    }
  } else {
    const entry = new order({

      bill: parseFloat(bil),
      customer: scn,
      item: sit,
      unit:sunit,
      price: parseFloat(pprice),
      quantity: parseInt(qquan),
      totalAmount: parseFloat(tt)

    });
    entry.save();
    stock.findOneAndUpdate({ item: sit }, { $inc: { quantity: -qquan } }).then((it) => { });

    
  }
  // Generate the PDF invoice
// Add line items header
// Generate the PDF invoice
/*
const doc = new PDFDocument();
const invoicePath = path.join(__dirname, 'assets/invoices', `invoice-${bil}.pdf`);
doc.pipe(fs.createWriteStream(invoicePath));

// Add header
doc.fontSize(20).text('Invoice', { align: 'center' });
doc.moveDown();

// Invoice details
doc.fontSize(12);
doc.text(`Bill No: ${bil}`, { align: 'left' });
doc.text(`Customer: ${scn}`, { align: 'left' });
doc.text(`Currency: ${sc}`, { align: 'left' });
doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'left' });
doc.text(`Total Amount: ${gt}`, { align: 'left' });
doc.text(`Payment: ${pd}`, { align: 'left' });
doc.text(`Discount: ${req.body.dis}`, { align: 'left' });
doc.text(`Remaining: ${rm}`, { align: 'left' });
doc.moveDown();

// Line separator
doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

// Add line items header
doc.text('Items:', { underline: true, align: 'left' });
doc.moveDown();

// Add line items
doc.text('Description          Quantity   Unit Price     Total', { align: 'left' });
doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(); // Underline header

if (Array.isArray(sit)) {
    for (let i = 0; i < sit.length; i++) {
        // Ensure the values are numbers
        const quantity = parseInt(qquan[i], 10);
        const unitPrice = parseFloat(pprice[i]);
        const total = parseFloat(tt[i]);

        // Check if conversions were successful
        if (!isNaN(quantity) && !isNaN(unitPrice) && !isNaN(total)) {
            doc.text(`${sit[i]}                ${quantity}       ${unitPrice.toFixed(2)}        ${total.toFixed(2)}`, {
                align: 'left'
            });
        } else {
            console.error(`Invalid data for item ${i}:`, {
                sit: sit[i],
                quantity: qquan[i],
                unitPrice: pprice[i],
                total: tt[i]
            });
        }
    }
} else {
    const quantity = parseInt(qquan, 10);
    const unitPrice = parseFloat(pprice);
    const total = parseFloat(tt);

    if (!isNaN(quantity) && !isNaN(unitPrice) && !isNaN(total)) {
        doc.text(`${sit}                ${quantity}       ${unitPrice.toFixed(2)}        ${total.toFixed(2)}`, { align: 'left' });
    } else {
        console.error(`Invalid data for single item:`, {
            sit: sit,
            quantity: qquan,
            unitPrice: pprice,
            total: tt
        });
    }
}

// Summary section
doc.moveDown();
doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(); // Underline total section
doc.text('Summary:', { underline: true, align: 'left' });
doc.moveDown();
doc.text(`Total Amount: ${gt}`, { align: 'left' });
doc.text(`Payment: ${pd}`, { align: 'left' });
doc.text(`Discount: ${req.body.dis}`, { align: 'left' });
doc.text(`Remaining: ${rm}`, { align: 'left' });

// Footer
doc.moveDown();
doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(); // Underline footer section
doc.text('Thank you for your business!', { align: 'center' });
doc.text('Please make all checks payable to Your Company Name', { align: 'center' });

// Finalize the PDF document
doc.end();*/
  res.redirect("/order1")
    }else{
      res.redirect('/login');
  }
  

});


app.post('/neworder', async (req, res) => {
  if (req.session.user) {
    const { payme, itms } = req.body; // Expecting user, orders, and productUpdate as JSON

  try {
    // Create and save the user
    const paym = new Payment(payme);
    await paym.save();

    // Create and save the orders
    const orderPromises = itms.map(itm => {
      return new order({
        bill: order.bill, // Associate orders with the new user
        customer: order.customer,
        quantity: order.quantity,
        unit:order.unit,
        price: order.price,
        item: order.item,
        totalAmount: order.totalAmount
      }).save();
    });

    // Wait for all orders to be saved
    await Promise.all(orderPromises);

    return res.json({ message: 'All data saved successfully!' });
  } catch (err) {
    console.error('Error saving data:', err);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Error saving data' });
    }
  }
    }else{
      res.redirect('/login');
  }
  

});
app.get('/customer', function (req, res) {
  if (req.session.user) {
    customer.find({}).sort({ _id: -1 }).then((all) => {

    res.render('customer', { bb: all })

  })
    }else{
      res.redirect('/login');
  }
});
app.post('/savedcustomer', function (req, res) {
  if (req.session.user) {
    const c = new customer({
    name: req.body.cn,
    address: req.body.add,
    phone: req.body.pn
  })
  c.save();
  res.redirect("/customer")
    }else{
      res.redirect('/login');
  }
})
app.get('/cdeleted/:id', function (req, res) {
  
  let iid = req.params.id;

  customer.findByIdAndDelete({ _id: iid }).then(() => {
    res.redirect("/customer")
  }).catch((error) => {
    res.status(500).json(error)
  });

});
app.post('/updpayment', function (req, res) {
  if (req.session.user) {
    let iid = req.body.bil;
  let rm = req.body.ur;
  let p = req.body.urm;
  let pad = req.body.pd;
  const sum = Number(p) + Number(pad);
  const minu = rm - p;

  Payment.findOneAndUpdate({ billno: iid }, {
    Paid: parseInt(sum)
    , remain: parseInt(minu)
  }).then(() => {
    res.redirect('/saleslist')
  })

    }else{
      res.redirect('/login');
  }
  
});
app.post('/stockupd', function (req, res) {
  if (req.session.user) {
     let it = req.body.bil;
  let un = req.body.ur;
  let q = req.body.urm;

  stock.findOneAndUpdate({ item: it }, {
    unit: un
    , quantity: parseInt(q)
  }).then(() => {
    res.redirect('/stock')
  })
    }else{
      res.redirect('/login');
  }
 

});
app.post('/userupd',isAuthorized('Admin'), function (req, res) {
  if (req.session.user) {
     let it = req.body.bil;
  let q = req.body.urm;

  user.findOneAndUpdate({ username: it }, {
    role: q,
  }).then(() => {
    res.redirect('/userpage')
  })
    }else{
      res.redirect('/login');
  }
 

});
app.get('/expense', function (req, res) {
  if (req.session.user) {
    expense.find({}).sort({ _id: -1 }).then((all) => {

    res.render('expenses', { bb: all })

  })
    }else{
      res.redirect('/login');
  }
  
});
app.post('/newexpense', function (req, res) {
  if (req.session.user) {
    const c = new expense({
    description: req.body.des,
    catagory: req.body.ct,
    currency: req.body.sc,
    amount: req.body.am,
  })
  c.save();
  res.redirect("/expense")
    }else{
      res.redirect('/login');
  }
  

});
app.get('/expensedeleted/:id', function (req, res) {
  if (req.session.user) {
    let iid = req.params.id;

  expense.findByIdAndDelete({ _id: iid }).then(() => {
    res.redirect("/expense")
  }).catch((error) => {
    res.status(500).json(error)
  });

    }else{
      res.redirect('/login');
  }
  
});

app.get('/login', function (req, res) {

  res.render('login')
});

  
app.post('/signin', (req, res) => {
  const username = req.body.tuser;
  const password = req.body.tpassword;
  user.findOne({ username: username }).then((foundUser) => {
    if (!foundUser) {
        // User not found
        return res.send('User not found. <a href="/">Try again</a>');
    }

    // Compare the provided password with the hashed password
    const isPasswordValid = bcrypt.compareSync(password, foundUser.password);
    
    if (isPasswordValid) {
        // Password is valid
        req.session.user = { username: foundUser.username, role: foundUser.role }; // Assuming you have a role property
        res.redirect('/');
    } else {
        // Password is invalid
        res.send('Invalid password. <a href="/">Try again</a>');
    }
}).catch(err => {
    console.error(err);
    res.status(500).send('An error occurred. Please try again later.');
});

});
app.get('/register',isAuthorized('Admin'), function (req, res) {
  if (req.session.user) {
    res.render('register')
    }else{
      res.redirect('/login');
  }

    
});
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
      if (err) {
          console.error(err);
          return res.redirect('/'); // Redirect back to profile if there's an error
      }
      res.redirect('/login'); // Redirect to the login page after successful logout
  });
});
app.post('/newuser', async (req, res) => {
  if (req.session.user) {
    const username= req.body.tuser;
  const password  = req.body.tpassword;
  const role=req.body.radio;
  const hashedPassword = await bcrypt.hash(password, 10);
  const us = new user({ username:username, password: hashedPassword,role:role });
  
  try {
      await us.save();
      res.redirect('/register')
  } catch (error) {
      res.status(400).send('Error registering user');
  }
    }else{
      res.redirect('/login');
  }
  
});


const purchaseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  unit: { type: String, required: true },
  currency: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  total: { type: Number },
  createdAt: { type: Date, default: Date.now }
});
const purchase = mongoose.model('Purchase', purchaseSchema);

const stockSchema = new mongoose.Schema({
  item: { type: String, required: true },
  unit: { type: String, required: true },
  quantity: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now }
});
const stock = mongoose.model('Stock', stockSchema);

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true},
  phone: { type: String },
  createdAt: { type: Date, default: Date.now }
});
const customer = mongoose.model('Customer', customerSchema);

const orderSchema = new mongoose.Schema({
  bill: { type: Number },
  customer: { type: String, required: true },
  currency:{ type: String, required: true },
  price: { type: Number, required: true },
  unit:{ type: String, required: true },
  quantity: { type: Number, required: true },
  item: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});
const order = mongoose.model('Order', orderSchema)

const expenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  catagory: { type: String, required: false },
  currency: { type: String, required: true },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});
const expense = mongoose.model('Expense', expenseSchema);

const orderReturnSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  reason: { type: String, required: true },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});
const orderReturn = mongoose.model('OrderReturn', orderReturnSchema);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, require:true },
  createdAt: { type: Date, default: Date.now }
});
const user = mongoose.model('User', userSchema);

const paymentSchema = new mongoose.Schema({
  billno: { type: String, required: true },
  customern: { type: String, required: true },
  currency: { type: String, required: true },
  Paid: { type: Number, required: true },
  Total: { type: Number, required: true },
  remain: { type: Number, required: true },
  discount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Payment = mongoose.model('Payment', paymentSchema);

const priceSchema = new mongoose.Schema({
  item: { type: String, unique:true, required: true },
  currency:{ type: String },
  price: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

const pricelist = mongoose.model('pricelist', priceSchema);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});