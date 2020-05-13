window.addEventListener('load', () => {
    const canvas = document.querySelector('#draw-area');
    const context = canvas.getContext('2d');
    const lastPosition = { x: null, y: null };
    let isDrag = false;
    function draw(x, y) {
      if(!isDrag) {
        return;
      }
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = 5;
      context.strokeStyle = 'black';
      if (lastPosition.x === null || lastPosition.y === null) {
        context.moveTo(x, y);
      } else {
        context.moveTo(lastPosition.x, lastPosition.y);
      }
      context.lineTo(x, y);
      context.stroke();
      lastPosition.x = x;
      lastPosition.y = y;
    }
    function clear() {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    function dragStart(event) {
      context.beginPath();
      //$(document).on('touchmove.scroll', function(event) {event.preventDefault();});
      isDrag = true;
    }
    function dragEnd(event) {
      context.closePath();
      //$(document).off('touchmove.scroll');
      isDrag = false;
      lastPosition.x = null;
      lastPosition.y = null;
    }
    function initEventHandler() {
      const clearButton = document.querySelector('#clear');
      clearButton.addEventListener('click', clear);
      canvas.addEventListener('mousedown', dragStart);
      canvas.addEventListener('mouseup', dragEnd);
      canvas.addEventListener('mouseout', dragEnd);
      canvas.addEventListener('mousemove', (e) => {
        draw(e.layerX, e.layerY);
      });
      canvas.addEventListener('touchstart', dragStart);
      canvas.addEventListener('touchend', dragEnd);
      canvas.addEventListener('touchmove', (e) => {
        if (e.layerX === undefined) {
          draw(e.touches[0].pageX - canvas.offsetLeft, e.touches[0].pageY - canvas.offsetTop);
        } else{
          draw(e.layerX, e.layerY);
        }
      });
      //canvas.addEventListener('touchmove.scroll', function(e) {e.preventDefault();}, { passive: false});
    }
    initEventHandler();
  });