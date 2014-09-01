require 'csv'
require 'bigdecimal'
require 'json'

data_file = "data.csv"
json_path = "../lib/readers.json"

start_column = 3
columns = nil

readers = { }

CSV.foreach(data_file) do |row|
  label = row[1]
  unless label.nil? or label==""
    # initialize columns count
    columns ||= row.size
    # fill readers
    for column in start_column..(columns - 1)
      # initialize reader
      readers[column.to_s] ||= { }
      # convert attribute
      value = nil
      case label
      when /feature\-/
        value = (BigDecimal.new(row[column].gsub(/,/, '.')) * 1000).round.to_i
      else
        value = row[column]
      end
      readers[column.to_s][label] = value
    end  
    label.gsub!(/^feature\-/, '')
  end
end


readers.delete_if { |k,r| r['keep'] == "0" }

File.open(json_path, 'w') { |file| 
  file.write JSON.generate(readers.values) 
}


