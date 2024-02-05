require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

const cors = require("cors");
const { default: mongoose } = require("mongoose");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xdpsuxi.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});

// Define Student Schema
const studentSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    contact: { type: String, required: true }
});

// Define Student Model
const Student = mongoose.model('Student', studentSchema);


const run = async () => {
    try {
        const db = client.db("ix-class-next");
        const categoryCollection = db.collection("category");
        const studentsCollection = db.collection("all-students");

        app.post("/category-group", async (req, res) => {
            const group = req.body;
            console.log(group);
            const result = await categoryCollection.insertOne(group);

            res.send(result);
        });
        app.get("/categories", async (req, res) => {
            const cursor = categoryCollection.find({});
            const allGroups = await cursor.toArray();

            res.send({ status: true, data: allGroups });
        });

        app.post('/create-students', async (req, res) => {
            try {
                // Check if a student with the same email or password already exists
                const { email, password } = req.body;
                const existingStudent = await studentsCollection.findOne({ $or: [{ email }, { password }] });
                if (existingStudent) {
                    return res.status(400).json({ error: 'Email/password/Contact already exists ' });
                }

                // Generate student code
                const highestStudent = await studentsCollection.findOne({}, { sort: { studentCode: -1 } });
                let studentCode;
                if (highestStudent) {
                    const nextCode = parseInt(highestStudent.studentCode) + 1;
                    studentCode = nextCode.toString().padStart(3, '0');
                } else {
                    studentCode = '001';
                }

                // Create new student
                const studentWithCode = { ...req.body, studentCode };
                const result = await studentsCollection.insertOne(studentWithCode);
                res.send(result);
            } catch (error) {
                console.error('Error adding student:', error);
                res.status(500).send('Error adding student');
            }
        });
        // Login route handler
        app.post('/login', async (req, res) => {
            try {
                const { email, password } = req.body;

                // Query the database to find a student with the provided email and password
                const student = await studentsCollection.findOne({ email, password });

                if (!student) {
                    return res.status(401).json({ error: 'Invalid email or password' });
                }

                // If student found, return a success response
                res.status(200).json({ message: 'Login successful', student });
            } catch (error) {
                console.error('Error logging in:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });



    }
    finally {
    }
}
run().catch((err) => console.log(err));
app.get("/", (req, res) => {
    res.send("ixth-backend-server runnig sunccessfully");
});

app.listen(port, () => {
    console.log(`app listening on port ${port}`);
});