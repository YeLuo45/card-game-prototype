// ============================================================================
// Card Astral Academy — V199 Direction D
// Astral academy with courses, student advancement, and astral exams
// generic-agent autonomous goal pursuit + chatdev role specialization
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // Course: An astral course
  // -----------------------------------------------------------------------
  function Course(courseId, name, subject, difficulty, credits) {
    this.courseId = courseId;
    this.name = name || courseId;
    this.subject = subject || 'general'; // elemental, dimensional, temporal, spiritual, arcane
    this.difficulty = difficulty || 1; // 1-5
    this.credits = credits || 3;
    this.enrolled = false;
    this.completed = false;
    this.grade = null; // S, A, B, C, D, F
  }

  Course.prototype.enroll = function () {
    if (this.enrolled) return { error: 'already_enrolled' };
    if (this.completed) return { error: 'already_completed' };
    this.enrolled = true;
    return { success: true };
  };

  Course.prototype.complete = function (score) {
    if (!this.enrolled) return { error: 'not_enrolled' };
    this.completed = true;
    this.enrolled = false;
    if (score >= 90) this.grade = 'S';
    else if (score >= 80) this.grade = 'A';
    else if (score >= 70) this.grade = 'B';
    else if (score >= 60) this.grade = 'C';
    else if (score >= 50) this.grade = 'D';
    else this.grade = 'F';
    return { success: true, grade: this.grade };
  };

  Course.prototype.getGradePoints = function () {
    var pts = { S: 4.0, A: 4.0, B: 3.0, C: 2.0, D: 1.0, F: 0.0 };
    return pts[this.grade] || 0;
  };

  // -----------------------------------------------------------------------
  // Student: A student in the academy
  // -----------------------------------------------------------------------
  function Student(studentId, name, year, dormitory) {
    this.studentId = studentId;
    this.name = name || studentId;
    this.year = year || 1;
    this.dormitory = dormitory || 'starter';
    this.coursesCompleted = [];
    this.currentCourses = [];
    this.totalCredits = 0;
    this.experience = 0;
    this.gpa = 0;
  }

  Student.prototype.enrollInCourse = function (course) {
    if (course.completed) return { error: 'course_completed' };
    if (this.currentCourses.length >= 4) return { error: 'max_courses_reached' };
    var r = course.enroll();
    if (r.error) return r;
    this.currentCourses.push(course); // store actual Course object
    return { success: true, currentCount: this.currentCourses.length };
  };

  Student.prototype.completeCourse = function (courseId, score) {
    var course = null;
    for (var i = 0; i < this.currentCourses.length; i++) {
      if (this.currentCourses[i].courseId === courseId) {
        course = this.currentCourses[i];
        break;
      }
    }
    if (!course) return { error: 'not_enrolled' };
    var r = course.complete(score);
    if (r.error) return r;
    this.totalCredits += course.credits;
    this.experience += course.credits * 10;
    this.coursesCompleted.push(course.courseId);
    this._recalculateGPA();
    return { success: true, gpa: this.gpa };
  };

  Student.prototype._recalculateGPA = function () {
    // simplified GPA
    this.gpa = (this.experience / Math.max(1, this.totalCredits * 10)) * 4.0;
  };

  Student.prototype.getTotalCredits = function () { return this.totalCredits; };
  Student.prototype.getExperience = function () { return this.experience; };
  Student.prototype.getGPA = function () { return this.gpa; };

  // --------------------------------------------------------------------===
  // Exam: An astral exam
  // --------------------------------------------------------------------===
  function Exam(examId, name, subject, difficulty, duration) {
    this.examId = examId;
    this.name = name || examId;
    this.subject = subject || 'general';
    this.difficulty = difficulty || 1;
    this.duration = duration || 60; // minutes
    this.registeredStudents = [];
    this.scores = {}; // studentId -> score
    this.held = false;
    this.averageScore = 0;
  }

  Exam.prototype.register = function (studentId) {
    if (this.registeredStudents.indexOf(studentId) !== -1) return { error: 'already_registered' };
    if (this.held) return { error: 'exam_already_held' };
    this.registeredStudents.push(studentId);
    return { success: true, registered: this.registeredStudents.length };
  };

  Exam.prototype.hold = function (scoreMap) {
    if (this.held) return { error: 'exam_already_held' };
    this.held = true;
    this.scores = scoreMap || {};
    var total = 0, count = 0;
    for (var sid in this.scores) { total += this.scores[sid]; count++; }
    this.averageScore = count > 0 ? total / count : 0;
    return { success: true, averageScore: this.averageScore };
  };

  Exam.prototype.getScore = function (studentId) { return this.scores[studentId] || null; };
  Exam.prototype.getAverageScore = function () { return this.averageScore; };
  Exam.prototype.getRegisteredCount = function () { return this.registeredStudents.length; };

  // --------------------------------------------------------------------===
  // AstralAcademy: Main academy manager
  // --------------------------------------------------------------------===
  function AstralAcademy(academyId, name) {
    this.academyId = academyId || ('academy_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'Astral Academy';
    this.courses = {};
    this.students = {};
    this.exams = {};
    this.courseCounter = 0;
    this.studentCounter = 0;
    this.examCounter = 0;
    this._seedDefault();
  }

  AstralAcademy.prototype._seedDefault = function () {
    var course = new Course('course_default', 'Astral Basics', 'general', 1, 3);
    this.courses['course_default'] = course;
  };

  AstralAcademy.prototype.addCourse = function (course) {
    this.courses[course.courseId] = course;
    return { success: true, count: Object.keys(this.courses).length };
  };

  AstralAcademy.prototype.addStudent = function (student) {
    this.students[student.studentId] = student;
    return { success: true, count: Object.keys(this.students).length };
  };

  AstralAcademy.prototype.addExam = function (exam) {
    this.exams[exam.examId] = exam;
    return { success: true, count: Object.keys(this.exams).length };
  };

  AstralAcademy.prototype.getCourse = function (id) { return this.courses[id] || null; };
  AstralAcademy.prototype.getStudent = function (id) { return this.students[id] || null; };
  AstralAcademy.prototype.getExam = function (id) { return this.exams[id] || null; };

  AstralAcademy.prototype.getAllCourses = function () {
    return Object.keys(this.courses).map(function (k) { return this.courses[k]; }.bind(this));
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.Course = Course;
  window.Student = Student;
  window.Exam = Exam;
  window.AstralAcademy = AstralAcademy;
})();