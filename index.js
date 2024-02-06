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

//Student Schema
const studentSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    contact: { type: String, required: true }
});

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
                // Check if a student with the same email, password, or contact already exists
                const { email, password, contact } = req.body;
                const existingStudent = await studentsCollection.findOne({ $or: [{ email }, { password }, { contact }] });
        
                if (existingStudent) {
                    let errorMessage = '';
                    if (existingStudent.email === email) {
                        errorMessage = 'Email is already exists';
                    } else if (existingStudent.password === password) {
                        errorMessage = 'Password is already exists';
                    } else if (existingStudent.contact === contact) {
                        errorMessage = 'Contact is already exists';
                    }
                    return res.status(400).json({ error: errorMessage });
                }
        
                // Find all existing student codes
                const existingStudents = await studentsCollection.find({}, { studentCode: 1 }).toArray();
                const existingCodes = existingStudents.map(student => parseInt(student.studentCode));
        
                // Find the missing serial numbers
                let missingCodes = [];
                for (let i = 1; i <= existingCodes.length + 1; i++) {
                    if (!existingCodes.includes(i)) {
                        missingCodes.push(i);
                    }
                }
        
                // Assign the next available missing serial number to the newly created student
                let studentCode;
                if (missingCodes.length > 0) {
                    studentCode = missingCodes[0].toString().padStart(3, '0');
                } else {
                    // If no missing serial numbers, generate the next sequential serial number
                    const highestCode = Math.max(...existingCodes);
                    studentCode = (highestCode + 1).toString().padStart(3, '0');
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
        

        app.get("/student/:id", async (req, res) => {
            const id = req.params.id;

            const result = await studentsCollection.findOne({ _id: new ObjectId(id) });
            console.log(result);
            res.send(result);
        });

        app.get('/students/:id', async (req, res) => {
            const id = req.params.group_id;
            const query = { categoryId: id };
            console.log(query)
            const result = await studentsCollection.find(query).toArray();
            if (result) {
                res.status(200).json({ message: `${result.length} students get successfully`, result });
            }
            else {
                res.status(404).json({ message: 'student not found' })
            }
            // res.send(result);

        })
     // Update student route handler
     app.put('/update/student/:id', async (req, res) => {
        try {
            const studentId = req.params.id;
            const filter = { _id: new ObjectId(studentId) }; // Define the filter to match the student ID
            const updatedData = req.body;
    
            // Check if the updated email, contact, or password already exists for another student
            const { email, contact, password } = updatedData;
            const existingStudent = await studentsCollection.findOne({ $or: [{ email }, { contact }, { password }] });
    
            // If another student with the same email, contact, or password exists and it's not the current student being updated
            if (existingStudent && existingStudent._id.toString() !== studentId) {
                return res.status(400).json({ error: 'this info is already exists try another' });
            }
    
            // Update the student document based on the provided student ID
            const result = await studentsCollection.updateOne(filter, { $set: updatedData });
            if (result.modifiedCount === 0) {
                return res.status(404).json({ error: 'Student not found or information not updated' });
            }
            res.status(200).json({ message: 'Student information updated successfully' });
        } catch (error) {
            console.error('Failed to update student information:', error);
            res.status(500).json({ error: 'Internal server error' });
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