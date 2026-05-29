// ============================================================================
// Card War Academy — V208 Direction D
// War academy with tactical courses, commander training, and battlefield sims
// generic-agent autonomous + nanobot distributed mesh
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // TacticalCourse: A tactical training course
  // -----------------------------------------------------------------------
  function TacticalCourse(courseId, name, difficulty, maxStudents, topic) {
    this.courseId = courseId;
    this.name = name || courseId;
    this.difficulty = difficulty || 1; // 1-5
    this.maxStudents = maxStudents || 20;
    this.topic = topic || 'general';
    this.students = []; // commanderIds
    this.completed = {}; // commanderId -> { grade, completedAt }
    this.active = true;
  }

  TacticalCourse.prototype.enroll = function (commanderId) {
    if (!this.active) return { error: 'course_inactive' };
    if (this.students.indexOf(commanderId) !== -1) return { error: 'already_enrolled' };
    if (this.students.length >= this.maxStudents) return { error: 'course_full' };
    this.students.push(commanderId);
    return { success: true, enrolled: this.students.length };
  };

  TacticalCourse.prototype.complete = function (commanderId, grade) {
    if (this.students.indexOf(commanderId) === -1) return { error: 'not_enrolled' };
    if (this.completed[commanderId]) return { error: 'already_completed' };
    if (grade < 1 || grade > 5) return { error: 'invalid_grade' };
    this.completed[commanderId] = { grade: grade, completedAt: Date.now() };
    return { success: true, grade: grade };
  };

  TacticalCourse.prototype.isCompleted = function (commanderId) {
    return !!this.completed[commanderId];
  };

  TacticalCourse.prototype.getEnrollmentCount = function () { return this.students.length; };

  // -----------------------------------------------------------------------
  // Commander: A trained commander
  // -----------------------------------------------------------------------
  function Commander(cmdId, name, rank, tactical) {
    this.cmdId = cmdId;
    this.name = name || cmdId;
    this.rank = rank || 'recruit'; // recruit, lieutenant, captain, major, colonel, general
    this.tactical = tactical || 1; // 1-5
    this.coursesCompleted = 0;
    this.xp = 0;
    this.assignedUnits = 0;
  }

  Commander.prototype.addXP = function (amount) {
    this.xp += amount;
    this._checkPromotion();
    return { success: true, xp: this.xp, rank: this.rank };
  };

Commander.prototype._checkPromotion = function () {
    var thresholds = { recruit: 0, lieutenant: 50, captain: 150, major: 300, colonel: 500, general: 800 };
    var ranks = ['recruit', 'lieutenant', 'captain', 'major', 'colonel', 'general'];
    for (var i = ranks.length - 1; i >= 0; i--) {
      if (this.xp >= thresholds[ranks[i]]) { this.rank = ranks[i]; break; }
    }
  };

  Commander.prototype.getRank = function () { return this.rank; };
  Commander.prototype.getXP = function () { return this.xp; };

  // --------------------------------------------------------------------===
  // WarAcademy: Main academy manager
  // ----------------------------------------------------------------=======
  function WarAcademy(academyId, name, maxCourses) {
    this.academyId = academyId || ('academy_' + Math.random().toString(36).substr(2, 6));
    this.name = name || 'War Academy';
    this.courses = {};
    this.commanders = {};
    this.maxCourses = maxCourses || 30;
    this.academyXP = 0;
    this.academyLevel = 1;
  }

  WarAcademy.prototype.addCourse = function (course) {
    this.courses[course.courseId] = course;
    return { success: true, count: Object.keys(this.courses).length };
  };

  WarAcademy.prototype.recruitCommander = function (commander) {
    this.commanders[commander.cmdId] = commander;
    return { success: true, count: Object.keys(this.commanders).length };
  };

  WarAcademy.prototype.getCourse = function (id) { return this.courses[id] || null; };
  WarAcademy.prototype.getCommander = function (id) { return this.commanders[id] || null; };

  WarAcademy.prototype.getCourseCount = function () { return Object.keys(this.courses).length; };

  WarAcademy.prototype.addXP = function (amount) {
    this.academyXP += amount;
    var thresholds = [0, 300, 800, 1500, 3000];
    var levels = [1, 2, 3, 4, 5];
    for (var i = levels.length - 1; i >= 0; i--) {
      if (this.academyXP >= thresholds[i]) { this.academyLevel = levels[i]; break; }
    }
    return { success: true, academyXP: this.academyXP, academyLevel: this.academyLevel };
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.TacticalCourse = TacticalCourse;
  window.Commander = Commander;
  window.WarAcademy = WarAcademy;
})();