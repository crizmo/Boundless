// Helper functions for handling polygon operations

/**
 * Create a proper polygon from a set of points
 * This is a placeholder for more advanced polygon algorithms
 * In a real implementation, you'd want to use a library like turf.js 
 * to properly handle the convex hull or concave hull of the points
 */
function createPolygon(points) {
  // For now, just return the convex hull of the points
  // In a real implementation, you'd use convex/concave hull algorithms
  return convexHull(points);
}

// Simple convex hull algorithm (Graham scan)
function convexHull(points) {
  if (points.length <= 3) return points;
  
  // Find the point with the lowest y-coordinate
  let lowestPoint = points[0];
  for (let i = 1; i < points.length; i++) {
    if (points[i][1] < lowestPoint[1] || 
       (points[i][1] === lowestPoint[1] && points[i][0] < lowestPoint[0])) {
      lowestPoint = points[i];
    }
  }
  
  // Sort points by polar angle
  const sortedPoints = points.slice();
  sortedPoints.sort((a, b) => {
    const angleA = Math.atan2(a[1] - lowestPoint[1], a[0] - lowestPoint[0]);
    const angleB = Math.atan2(b[1] - lowestPoint[1], b[0] - lowestPoint[0]);
    return angleA - angleB;
  });
  
  // Build convex hull
  const hull = [sortedPoints[0], sortedPoints[1]];
  for (let i = 2; i < sortedPoints.length; i++) {
    while (hull.length > 1 && crossProduct(
      hull[hull.length - 2], 
      hull[hull.length - 1], 
      sortedPoints[i]) <= 0) {
      hull.pop();
    }
    hull.push(sortedPoints[i]);
  }
  
  return hull;
}

// Cross product to determine the turn direction
function crossProduct(p1, p2, p3) {
  return (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0]);
}

/**
 * Calculate the area of a polygon using the Shoelace formula
 * @param {Array} polygon - Array of [lat, lng] coordinates
 * @returns {Number} - The area of the polygon in square units
 */
function calculatePolygonArea(polygon) {
  let area = 0;
  
  // Need at least 3 points to form a polygon
  if (polygon.length < 3) return 0;
  
  // Apply shoelace formula
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i][0] * polygon[j][1];
    area -= polygon[j][0] * polygon[i][1];
  }
  
  // Take absolute value and divide by 2
  area = Math.abs(area) / 2;
  
  // Scale the area for better game balance
  // Since geographical coordinates are very small differences
  return area * 10000000; // Scale factor to make scores more readable
}

/**
 * Check if a point is inside a polygon
 * @param {Array} point - [lat, lng] coordinates
 * @param {Array} polygon - Array of [lat, lng] coordinates
 * @returns {Boolean} - True if point is inside polygon
 */
function isPointInPolygon(point, polygon) {
  if (!polygon || polygon.length < 3) return false;
  
  // Simple ray-casting algorithm
  let inside = false;
  const [x, y] = point;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    
    const intersect = ((yi > y) !== (yj > y)) && 
                      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Check if two polygons overlap/intersect
 * @param {Array} polygon1 - Array of [lat, lng] coordinates for the first polygon
 * @param {Array} polygon2 - Array of [lat, lng] coordinates for the second polygon
 * @returns {Boolean} - True if the polygons overlap
 */
function doPolygonsOverlap(polygon1, polygon2) {
  // Check if any point of polygon1 is inside polygon2
  for (const point of polygon1) {
    if (isPointInPolygon(point, polygon2)) {
      return true;
    }
  }
  
  // Check if any point of polygon2 is inside polygon1
  for (const point of polygon2) {
    if (isPointInPolygon(point, polygon1)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get points from one polygon that are inside another polygon
 * @param {Array} polygon - The polygon to check points from
 * @param {Array} clipPolygon - The polygon to check against
 * @returns {Array} - Points from polygon that are inside clipPolygon
 */
function getPointsInsidePolygon(polygon, clipPolygon) {
  return polygon.filter(point => isPointInPolygon(point, clipPolygon));
}

module.exports = {
  createPolygon,
  calculatePolygonArea,
  isPointInPolygon,
  doPolygonsOverlap,
  getPointsInsidePolygon
};