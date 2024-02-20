require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

const cors = require("cors");

const { default: mongoose } = require("mongoose");

// app.use(cors());
app.use(express.json());

app.use(cors({
    origin: "http://localhost:3000", // Replace with your actual frontend origin
    methods: ["GET", "POST"], // Specify allowed methods
    credentials: true, // Allow cookies for authenticated requests
  }));
  
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
        const teachersCollection = db.collection("teachers");
        const resultsCollection = db.collection("results");
        const examCollection = db.collection("exam-name");

        app.post("/examName", async (req, res) => {
            const exam = req.body;
            console.log(exam);
            const existingExam = await examCollection.findOne({ name: exam.name });
            if (existingExam) {
                return res.status(400).json({ error: "Exam name already exists" });
            }
            const result = await examCollection.insertOne(exam);
        
            res.send(result);
        });
        app.get("/examName/:id", async (req, res) => {
            const id = req.params.id;

            const result = await examCollection.findOne({ _id: new ObjectId(id) });
            console.log(result);
            res.send(result);
        });
        app.get("/examName", async (req, res) => {
            const cursor = examCollection.find({});
            const allGroups = await cursor.toArray();

            res.send({ status: true, data: allGroups });
        });
        app.put("/examName/:id", async (req, res) => {
            const examId = req.params.id;
            const updatedExam = req.body;
        
            try {
                // Check if the exam with the given ID exists in the database
                const existingExam = await examCollection.findOne({ _id: new ObjectId(examId) });
                if (!existingExam) {
                    return res.status(404).json({ error: "Exam not found" });
                }
                const isDataChanged = JSON.stringify(existingExam) !== JSON.stringify(updatedExam);
                if (!isDataChanged) {
                    return res.status(200).json({ message: "Data did not update", data: existingExam });
                }
                await examCollection.updateOne({ _id: new ObjectId(examId) }, { $set: updatedExam });
        
                res.status(200).json({ message: "Updated successfully", data: updatedExam });
            } catch (error) {
                console.error("Error updating exam name:", error);
                res.status(500).json({ error: "Internal server error" });
            }
        });

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
        app.get("/students", async (req, res) => {
            const cursor = studentsCollection.find({});
            const allStudent = await cursor.toArray();

            res.send({ status: true, data: allStudent });
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
                        errorMessage = 'Password is already exists, please set unique password';
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

                // Fetch the newly inserted student from the database
                const newStudent = await studentsCollection.findOne({ _id: result.insertedId });

                // Send the response with acknowledgment and new student details
                res.status(201).json({ acknowledged: true, student: newStudent });
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

        app.put('/update/student/:id', async (req, res) => {
            try {
                const studentId = req.params.id;
                const filter = { _id: new ObjectId(studentId) }; // Define the filter to match the student ID
                const updatedData = req.body;
                const { email, contact, password } = updatedData;

                if (email) {
                    const existingStudentEmail = await studentsCollection.findOne({ email });
                    if (existingStudentEmail && existingStudentEmail._id.toString() !== studentId) {
                        return res.status(400).json({ error: 'Email is already exists. Please try a different one.' });
                    }
                }

                if (contact) {
                    const existingStudentContact = await studentsCollection.findOne({ contact });
                    if (existingStudentContact && existingStudentContact._id.toString() !== studentId) {
                        return res.status(400).json({ error: 'Contact is already exists. Please try a different one.' });
                    }
                }

                if (password) {
                    const existingStudentPassword = await studentsCollection.findOne({ password });
                    if (existingStudentPassword && existingStudentPassword._id.toString() !== studentId) {
                        return res.status(400).json({ error: 'Password is already exists. Please try a different one.' });
                    }
                }

                const result = await studentsCollection.updateOne(filter, { $set: updatedData });
                if (result.modifiedCount === 0) {
                    return res.status(404).json({ error: 'Information not updated' });
                }

                res.status(200).json({ message: 'Student information updated successfully', result: result, updatedData: updatedData });
            } catch (error) {
                console.error('Failed to update student information:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });


        app.delete("/student/:id", async (req, res) => {
            const id = req.params.id;

            const result = await studentsCollection.deleteOne({ _id: new ObjectId(id) });
            console.log(result);
            res.send(result);
        });
        // Login route handler
        app.post('/student/login', async (req, res) => {
            try {
                const { email, password } = req.body;
                const student = await studentsCollection.findOne({ email });
                if (!student) {
                    return res.status(401).json({ error: 'Invalid email' });
                }
                if (student.password !== password) {
                    return res.status(401).json({ error: 'Invalid password' });
                }
                res.status(200).json({ message: 'Login successful', student });
            } catch (error) {
                console.error('Error logging in:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        app.post("/create-teachers", async (req, res) => {
            try {
                // Check if a teacher with the same email, password, or contact already exists
                const { email, password, contact } = req.body;
                const existingTeacher = await teachersCollection.findOne({ $or: [{ email }, { password }, { contact }] });

                if (existingTeacher) {
                    let errorMessage = '';
                    if (existingTeacher.email === email) {
                        errorMessage = 'Email is already exists';
                    } else if (existingTeacher.password === password) {
                        errorMessage = 'Password is already exists';
                    } else if (existingTeacher.contact === contact) {
                        errorMessage = 'Contact is already exists';
                    }
                    return res.status(400).json({ error: errorMessage });
                }

                // If no existing teacher found with the same email, password, or contact, create a new teacher
                const result = await teachersCollection.insertOne(req.body);
                const newTeacher = await teachersCollection.findOne({ _id: result.insertedId });
                res.status(201).json({ acknowledged: true, teacher: newTeacher });
                console.log(newTeacher)
            } catch (error) {
                console.error('Error adding teacher:', error);
                res.status(500).send('Error adding teacher');
            }
        });

        app.get("/all-teachers", async (req, res) => {
            const cursor = teachersCollection.find({});
            const allTeachers = await cursor.toArray();

            res.send({ status: true, message: allTeachers.length, data: allTeachers });
        });

        app.post('/teacher/login', async (req, res) => {
            try {
                const { email, password } = req.body;

                // Find a teacher with the provided email
                const teacher = await teachersCollection.findOne({ email });

                // If no teacher found with the provided email, return error
                if (!teacher) {
                    return res.status(401).json({ error: 'Invalid email!' });
                }

                // If the teacher's password doesn't match the provided password, return error
                if (teacher.password !== password) {
                    return res.status(401).json({ error: 'Invalid password!' });
                }

                // If both email and password match, login is successful
                res.status(200).json({ message: 'Login successful', teacher });
            } catch (error) {
                console.error('Error logging in:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        app.put('/update/teacher/:id', async (req, res) => {
            try {
                const teacherId = req.params.id;
                const filter = { _id: new ObjectId(teacherId) };
                const updatedData = req.body;
                const { email, contact, password } = updatedData;

                const existingTeacherEmail = await teachersCollection.findOne({ email });
                const existingTeacherContact = await teachersCollection.findOne({ contact });
                const existingTeacherPassword = await teachersCollection.findOne({ password });

                if (existingTeacherEmail && existingTeacherEmail._id.toString() !== teacherId) {
                    return res.status(400).json({ error: 'Email is already exists. Please try a different one.' });
                }

                if (existingTeacherContact && existingTeacherContact._id.toString() !== teacherId) {
                    return res.status(400).json({ error: 'Contact is already exists. Please try a different one.' });
                }

                if (existingTeacherPassword && existingTeacherPassword._id.toString() !== teacherId) {
                    return res.status(400).json({ error: 'Password is already exists. Please try a different one.' });
                }

                // Update the teacher document based on the provided teacher ID
                const result = await teachersCollection.updateOne(filter, { $set: updatedData });

                if (result.modifiedCount === 0) {
                    return res.status(404).json({ error: 'information not updated' });
                }

                res.status(200).json({ message: 'Teacher information updated successfully', result: result, updatedData: updatedData });
            } catch (error) {
                console.error('Failed to update information:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        app.delete("/teacher/:id", async (req, res) => {
            const id = req.params.id;

            const result = await teachersCollection.deleteOne({ _id: new ObjectId(id) });
            console.log(result);
            res.send(result);
        });

        // ------------------------result make---------------------------

        app.get('/singleResult/:studentCode', async (req, res) => {
            const id = req.params.studentCode;
            const query = { studentCode: id };
            console.log(query)
            const result = await resultsCollection.find(query).toArray();
            if (result) {
                res.status(200).json({message : "result get successfully", result});
            }
            else {
                res.status(404).json({ message: 'result not found' })
            }
           
        })

        app.post("/create-result", async (req, res) => {
            const group = req.body;
            const studentCode = group.studentCode;
            const existingResult = await resultsCollection.findOne({ studentCode });

            if (existingResult) {
                return res.status(400).json({ success: false, message: "Result already exists for this student code" });
            }
            try {
                const { physics, chemistry, biology, math, bangla, english, history } = req.body;

                // Calculate total marks-----------------------------
                const totalMarks = physics + chemistry + biology + math + bangla + english + history;

                // Check if any subject has less than 33 marks--------------------
                const marksArray = [physics, chemistry, biology, math, bangla, english, history];
                const hasFailingGrade = marksArray.some(mark => mark < 33);

                // Calculate GPA------------------------
                let gpa;
                if (hasFailingGrade) {
                    gpa = 0.00;
                } else {
                    const totalGradePoints = marksArray.reduce((acc, mark) => acc + calculateGradePoint(mark), 0);
                    const numberOfSubjects = marksArray.length;
                    gpa = +(totalGradePoints / numberOfSubjects).toFixed(2);
                }

                //grade based on GPA=======---------------------
                const grade = calculateGradeFromGPA(gpa);
                const result = {
                    physics,
                    chemistry,
                    biology,
                    math,
                    bangla,
                    english,
                    history,
                    totalMarks,
                    gpa,
                    grade,
                    studentCode: req.body.studentCode,
                    name: req.body.name
                };

                // Insert result into the database---------------------
                const insertionResult = await resultsCollection.insertOne(result);

                if (insertionResult.acknowledged) {
                    return res.status(200).json({ success: true, message: "Result created successfully", result });
                } else {
                    return res.status(400).json({ success: false, message: "Failed to create result" });
                }
            } catch (error) {
                console.error("Error creating result:", error);
                return res.status(500).json({ success: false, message: "Internal server error" });
            }
        });

        app.put("/updateResult/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const updatedResult = req.body;
                const objectId = new ObjectId(id);

                const existingResult = await resultsCollection.findOne({ _id: objectId });

                if (!existingResult) {
                    return res.status(404).json({ success: false, message: "Result not found for the provided ID" });
                }

                // Filter out non-subject fields
                const subjectMarks = {};
                Object.keys(updatedResult).forEach(key => {
                    if (['physics', 'chemistry', 'biology', 'math', 'bangla', 'english', 'history'].includes(key)) {
                        subjectMarks[key] = updatedResult[key];
                    }
                });

                // Check if any subject mark is less than 33
                const isAnySubjectBelow33 = Object.values(subjectMarks).some(mark => typeof mark === 'number' && mark < 33);

                // Calculate total marks
                const totalMarks = Object.values(subjectMarks).reduce((acc, cur) => typeof cur === 'number' ? acc + cur : acc, 0);

                // Calculate GPA and grade
                let gpa = 0.00;
                let grade = 'F';

                if (!isAnySubjectBelow33) {
                    const totalGradePoints = Object.values(subjectMarks).reduce((acc, mark) => acc + calculateGradePoint(mark), 0);
                    const numberOfSubjects = Object.keys(subjectMarks).length;
                    gpa = +(totalGradePoints / numberOfSubjects).toFixed(2);
                    const roundedGPA = gpa.toFixed(2);
                    grade = calculateGradeFromGPA(gpa);
                }

                // Update the total marks, GPA, and grade
                updatedResult.totalMarks = totalMarks;
                updatedResult.gpa = gpa;
                updatedResult.grade = grade;

                // Update the result in the database
                const result = await resultsCollection.updateOne({ _id: objectId }, { $set: updatedResult });

                if (result.modifiedCount === 1) {
                    return res.status(200).json({ success: true, message: "Result updated successfully", updatedResult });
                } else {
                    return res.status(400).json({ success: false, message: "Information not updated" });
                }
            } catch (error) {
                console.error("Error updating result:", error);
                return res.status(500).json({ success: false, message: "Internal server error" });
            }
        });

        function calculateGradePoint(marks) {
            if (marks >= 80) {
                return 5.00;
            } else if (marks >= 70) {
                return 4.00;
            } else if (marks >= 60) {
                return 3.50;
            } else if (marks >= 50) {
                return 3.00;
            } else if (marks >= 40) {
                return 2.00;
            } else if (marks >= 33) {
                return 1.00;
            } else {
                return 0.00;
            }
        }

        function calculateGradeFromGPA(gpa) {
            if (gpa === 5.00) {
                return 'A+';
            } else if (gpa >= 4.00) {
                return 'A';
            } else if (gpa >= 3.50) {
                return 'A-';
            } else if (gpa >= 3.00) {
                return 'B';
            } else if (gpa >= 2.00) {
                return 'C';
            } else if (gpa >= 1.00) {
                return 'D';
            } else {
                return 'F';
            }
        }

        app.get("/results", async (req, res) => {
            const cursor = resultsCollection.find({});
            const allResults = await cursor.toArray();

            res.send({ status: true, data: allResults });
        });

        app.get("/result/:id", async (req, res) => {
            const id = req.params.id;

            const result = await resultsCollection.findOne({ _id: new ObjectId(id) });
            console.log(result);
            res.send(result);
        });

        app.delete("/result/delete/:id", async (req, res) => {
            const id = req.params.id;

            const result = await resultsCollection.deleteOne({ _id: new ObjectId(id) });
            console.log(result);
            res.send(result);
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