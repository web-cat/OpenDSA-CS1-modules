(function() {
  "use strict";

  var jsav, // The JSAV object
    answerArr = [], // The (internal) array that stores the correct answer
    answerOrderArr = [], // The (internal) array that stores the correct order of nodes' ids
    answerHead, // Correct answer of 'head' node.
    answerCurr, // Correct answer of 'curr' node.
    answerTail, // Correct answer of 'tail' node.
    answerCopyFrom, // Correct answer of node from which the return 'box' copies value.
    answerCopyVal, // Correct value of the return 'box'.
    llist_head, // Stores the head node of the list
    orderArr = [], // Initial node ids of the JSAV list.
    listSize, // JSAV list size
    listArr = [], // Initial node elements' values for the JSAV list.
    jsavList, // JSAV list
    jsavCopyArr, // Return 'box'.
    connections = [], // Stores the node-pairs of the JSAV-List arrows.
    fromNode, // Stores the node whose pointer area is clicked.
    headNode, // Used to trace the node pointed by 'head' pointer.
    currNode, // Used to trace the node pointed by 'curr' pointer.
    tailNode, // Used to trace the node pointed by 'tail' pointer.
    copyFrom, // Used to trace the node where the return 'box' copies value from.
    currPosition, // Index of 'curr' node, starting counting from the next node of head
    selected_pointer, // Pointer that has been selected by user.
    selected_node, // Node that has been selected by user.
    status = 0; // status = 0 : nothing is currently selected;
                // status = 1 : data area of the node has been selected;
                //              selected_node !== null
                // status = 2 : pointer area of the node has been selected.
                //              fromNode !== null
                // status = 3 : Label area of the pointer has been selected.
                //              selected_pointer !== null

  var llistRemovePRO = {
    userInput: null, // Boolean: Tells us if user ever did anything

    pclick: function(pointer) {
      if (status === 1) {
        selected_node.removeClass("bgColor");
        selected_node = null;
      } else if (status === 3) {
        if (selected_pointer !== pointer) {
          selected_pointer.element.removeClass("highlight");
        } else {
          selected_pointer.element.removeClass("highlight");
          selected_pointer = null;
          status = 0;
          return;
        }
      }
      selected_pointer = pointer;
      selected_pointer.element.toggleClass('highlight');
      status = 3;
    },

    // Helper function for setting pointer
    setPointer: function(name, newnode, oldpointer, opt) {
      if (oldpointer) {
        if (newnode === oldpointer.target()) {
          return;
        }
      }
      if (newnode.llist_pleft && newnode.llist_pright) {
        return;
      }
      var pointerRight = {
        visible: true,
        anchor: "right top",
        myAnchor: "left bottom",
        left: -5,
        top: -20
      };
      var pointerLeft = {
        visible: true,
        anchor: "left top",
        myAnchor: "right bottom",
        left: 15,
        top: -20
      };

      if (oldpointer) {
        if (oldpointer.target().llist_pleft === oldpointer) {
          oldpointer.target().llist_pleft = null;
        } else if (oldpointer.target().llist_pright === oldpointer) {
          oldpointer.target().llist_pright = null;
        }
        // Remove the old pointer
        oldpointer.element.remove();
        oldpointer.arrow.element.remove();
      }

      if (!newnode.llist_pleft) {
        newnode.llist_pleft = newnode.jsav.pointer(name, newnode, pointerLeft);
        newnode.llist_pleft.click(llistRemovePRO.pclick);
        return newnode.llist_pleft;
      } else if (!newnode.llist_pright) {
        newnode.llist_pright = newnode.jsav.pointer(name, newnode, pointerRight);
        newnode.llist_pright.click(llistRemovePRO.pclick);
        return newnode.llist_pright;
      }
    },

    // Add an edge from obj1(node) to obj2(node)
    connection: function(obj1, obj2) {
      if (obj1 === obj2) {
        return;
      }
      var left = obj1.jsav.container.find(".jsavcanvas:first").offset().left;
      var top = obj1.jsav.container.find(".jsavcanvas:first").offset().top;
      var fx = obj1.element.offset().left + 39 - left;
      var tx = obj2.element.offset().left + 2 - left;
      var fy = obj1.element.offset().top + 16 - top;
      var ty = obj2.element.offset().top + 16 - top;
      var fx1 = fx,
        fy1 = fy,
        tx1 = tx,
        ty1 = ty;

      var disx = (fx - tx - 22) > 0 ? 1 : (fx - tx - 22) === 0 ? 0 : -1;
      var disy = (fy - ty) > 0 ? 1 : (fy - ty) === 0 ? 0 : -1;

      var dx = Math.max(Math.abs(fx - tx) / 2, 35);
      var dy = Math.max(Math.abs(fy - ty) / 2, 35);
      if ((fy - ty > -10) && (fy - ty < 10) && ((tx - fx < 36) || (tx - fx > 38))) {
        dx = Math.min(Math.abs(fx - tx), 20);
        dy = Math.min(Math.abs(fx - tx) / 3, 50);
        tx += 22;
        ty += 15;
        fx1 = fx;
        fy1 = fy + dy;
        tx1 = tx + dx;
        ty1 = ty + dy;
      }
      var edge = jsav.g.path(["M", fx, fy, "C", fx1, fy1, tx1, ty1, tx, ty].join(","), {
        "arrow-end": "classic-wide-long",
        "opacity": 100,
        "stroke-width": 2,
      });

      if (obj1.llist_next) {
        obj1.llist_edgeToNext.element.remove();
      } else {
        obj1.llist_tail.element.remove();
        obj1.llist_tail = null;
      }

      obj1.llist_edgeToNext = edge;
      obj1.llist_next = obj2;
    },

    // Function for connecting two nodes
    Connect: function(obj1, obj2) {
      if (obj1 === obj2) {
        return;
      }
      llistRemovePRO.connection(obj1, obj2);
      obj1.llist_next = obj2;
      obj1._next = obj2;
      for (var i = 0; i < connections.length; i++) {
        if ((connections[i].from === obj1) && (connections[i].to !== obj2)) {
          connections[i].to = obj2;
          return;
        }
      }
      connections.push({
        from: obj1,
        to: obj2
      });
    },

    // Click event handler for 'return' array
    copyHandler: function() {
      if (status === 1) {
        jsav.effects.copyValue(selected_node, jsavCopyArr, 0);
        selected_node.removeClass("bgColor");
        copyFrom = selected_node;
        status = 0;
      }
    },

    // Click event handler on the list
    clickHandler: function(e) {
      var x = parseInt(e.pageX - $('#' + this.id()).offset().left);
      var y = parseInt(e.pageY - $('#' + this.id()).offset().top);
      if ((x > 31) && (x < 42) && (y > 0) && (y < 31)) {
        if (status === 1) {
          selected_node.removeClass("bgColor");
          selected_node = null;
        } else if (status === 2) {
          $('#' + fromNode.id() + " .jsavpointerarea:first").removeClass("bgColor");
        }

        if ((status === 0) || (status === 1)) {
          $('#' + this.id() + " .jsavpointerarea:first").addClass("bgColor");
          fromNode = this;
          status = 2;
        } else if (status === 2) {
          if (this.id() === fromNode.id()) {
            $('#' + this.id() + " .jsavpointerarea:first").removeClass("bgColor");
            fromNode = null;
            status = 0;
          } else {
            $('#' + this.id() + " .jsavpointerarea:first").addClass("bgColor");
            fromNode = this;
            status = 2;
          }
        }
      } else {
        if (status === 0) {
          this.addClass('bgColor');
          selected_node = this;
          status = 1;
        } else if (status === 1) {
          this.value(selected_node.value());
          selected_node.removeClass('bgColor');
          jsav.effects.copyValue(selected_node, this);
          selected_node = null;
          status = 0;
        } else if (status === 2) {
          llistRemovePRO.Connect(fromNode, this);
          $('#' + fromNode.id() + " .jsavpointerarea:first").removeClass('bgColor');
          $('#' + this.id()).removeClass('bgColor');
          fromNode = null;
          status = 0;
        } else if (status == 3) {
          var oldPointer = selected_pointer;
          oldPointer.element.removeClass('highlight');
          if (oldPointer.target() !== this) {
            selected_pointer = llistRemovePRO.setPointer(selected_pointer.element.text(), this, oldPointer);
            if (selected_pointer && selected_pointer.element.text() === "head") {
              headNode = selected_pointer.target();;
            } else if (selected_pointer && selected_pointer.element.text() === "curr") {
              currNode = selected_pointer.target();;
            } else if (selected_pointer && selected_pointer.element.text() === "tail") {
              tailNode = selected_pointer.target();;
            }
          }
          status = 0;
        }
        llistRemovePRO.userInput = true;
      }
    },

    // Helper function for adding a tail to the target node.
    addTail: function(node) {
      var left = node.element.offset().left - jsav.container.find(".jsavcanvas:first").offset().left;
      var top = node.element.offset().top - jsav.container.find(".jsavcanvas:first").offset().top;
      var fx = left + 34;
      var tx = left + 44;
      var fy = top + 32;
      var ty = top + 1;

      if (node.llist_tail) {
        node.llist_tail.element.remove();
        node.llist_tail = jsav.g.line(fx, fy, tx, ty, {
          "opacity": 100,
          "stroke-width": 1
        });
      } else {
        node.llist_tail = jsav.g.line(fx, fy, tx, ty, {
          "opacity": 100,
          "stroke-width": 1
        });
      }
      node.llist_next = null;
    },

    // Click event handler of 'makenull' button.
    nullClickHandler: function(index, e) {
      if (status == 2) {
        $('#' + fromNode.id() + " .jsavpointerarea:first").removeClass('bgColor');
        llistRemovePRO.addTail(fromNode);
        if (fromNode.llist_edgeToNext) {
          fromNode.llist_edgeToNext.element.remove();
          fromNode.llist_next = null;
        }
        status = 0;
      }
      llistRemovePRO.userInput = true;
    },

    // Reinitialize the exercise.
    f_reset: function() {
      // JSAV-List position.
      var leftMargin = 20,
        topMargin = 50;
      // Reset the value of global variables.
      llistRemovePRO.userInput = false;
      answerOrderArr.length = 0;
      connections = [];
      selected_node = null;
      selected_pointer = null;
      copyFrom = null;
      status = 0;

      // Clear the old JSAV canvas.
      if ($("#LlistRemovePRO")) {
        $("#LlistRemovePRO").empty();
      }

      jsav = new JSAV("LlistRemovePRO");
      // JSAV list
      jsavList = jsav.ds.list({
        "nodegap": 30,
        "top": topMargin,
        left: leftMargin
      });
      jsavList.addFirst("null");
      for (var i = listSize - 2; i > 0; i--) {
        jsavList.addFirst(listArr[i]);
      }
      jsavList.addFirst("null");
      jsavList.layout();

      // 'return' JSAV array
      jsavCopyArr = jsav.ds.array(["null"], {
        left: leftMargin + 10 + 73 * (currPosition + 1),
        top: topMargin + 70
      });
      // 'return' Label
      jsav.label("return", {
        left: leftMargin - 35 + 73 * (currPosition + 1),
        top: topMargin + 74
      });
      // Create pointers
      llistRemovePRO.setPointer("head", jsavList.get(0));
      llistRemovePRO.setPointer("curr", jsavList.get(currPosition + 1));
      llistRemovePRO.setPointer("tail", jsavList.get(listSize - 1));

      for (var i = 0; i < listSize; i++) {
        orderArr[i] = jsavList.get(i).id();
        jsavList.get(i).llist_next = jsavList.get(i).next();
        jsavList.get(i).llist_edgeToNext = jsavList.get(i).edgeToNext();
        jsavList.get(i).llist_tail = null;
      }
      // Add tail for the last node.
      jsavList.get(listSize - 1).llist_tail = llistRemovePRO.addTail(jsavList.get(listSize - 1));
      jsav.recorded();
      jsav.forward();

      llist_head = jsavList.get(0);
      headNode = jsavList.get(0);
      currNode = jsavList.get(currPosition + 1);
      tailNode = jsavList.get(listSize - 1);

      // Correct answer.
      if (currPosition !== listSize - 2) {
        for (var i = 0; i < listSize; i++) {
          if (i !== currPosition + 2) {
            answerOrderArr.push(orderArr[i]);
          }
        }
      } else {
        answerOrderArr = orderArr.slice(0);
      }
      answerCurr = jsavList.get(currPosition + 1);
      answerHead = jsavList.get(0);
      if (currPosition === listSize - 3) {
        answerTail = jsavList.get(listSize - 2);
      } else {
        answerTail = jsavList.get(listSize - 1);
      }
      if (currPosition === listSize - 2) {
        answerCopyFrom = null;
        answerCopyVal = "null";
      } else {
        answerCopyFrom = jsavList.get(currPosition + 1);
        answerCopyVal = jsavList.get(currPosition + 1).value();
      }

      // Rebind click handlers
      jsavCopyArr.click(llistRemovePRO.copyHandler);
      jsavList.click(llistRemovePRO.clickHandler);
    },

    // Initialise the exercise
    initJSAV: function(size, pos) {
      // Out with the old
      answerArr.length = 0;
      answerOrderArr.length = 0;
      listSize = size;
      currPosition = pos;

      // Give random numbers in range 0..999
      answerArr[0] = "null";
      for (i = 1; i < size - 1; i++) {
        answerArr[i] = Math.floor(Math.random() * 1000);
      }
      answerArr[size - 1] = "null";
      // Make a copy
      listArr = answerArr.slice(0);

      llistRemovePRO.f_reset();

      // correct answer of array values.
      if (currPosition !== listSize - 2) {
        answerArr.splice(currPosition + 1, 1);
      }
      // Set up handler for 'makenull' button.
      $("#makenull").click(function() {
        llistRemovePRO.nullClickHandler();
      });
      // Set up handler for reset button
      $("#reset").click(function() {
        llistRemovePRO.f_reset();
      });
    },

    // Check user's answer for correctness: User's array must match answer
    checkAnswer: function(arr_size, curr_pos) {
      var i = 1,
        curr = llist_head;
      // Check the 'return' array
      if ((copyFrom !== answerCopyFrom) || (answerCopyVal !== jsavCopyArr.value(0))) {
        return false;
      }
      // Check the pointers
      if ((headNode !== answerHead) || (currNode !== answerCurr) || (tailNode !== answerTail)) {
        return false;
      }
      // Check the list
      if ((curr.value() !== answerArr[0]) || (curr.id() !== answerOrderArr[0])) {
        return false;
      }
      while (curr.llist_next) {
        curr = curr.llist_next;
        if ((curr.value() === answerArr[i]) && (curr.id() === answerOrderArr[i])) {
          i++;
        } else {
          return false;
        }
      }
      // if 'curr' points to the 'tail' node.
      if (curr_pos === arr_size - 2) {
        return true;
      }

      if (i === listSize - 1) {
        return true;
      }
      return false;
    }

  };

  window.llistRemovePRO = window.llistRemovePRO || llistRemovePRO;
}());
